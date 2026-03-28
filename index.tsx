"use client";

/**
 * NicheLab — index.tsx
 * Next.js 14 App Router · Tailwind CSS · Framer Motion · Supabase Auth · Stripe
 *
 * Fonts required in layout.tsx:
 *   import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
 *
 * Env vars required (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   NEXT_PUBLIC_STRIPE_STARTER_LINK   (Stripe payment link URL)
 *   NEXT_PUBLIC_STRIPE_PRO_LINK       (Stripe payment link URL)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────
// SUPABASE CLIENT
// ─────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─────────────────────────────────────────────────────────
// STRIPE CHECKOUT HANDLER
// ─────────────────────────────────────────────────────────
async function handleCheckout(planId: "starter" | "pro") {
  const { data: { session } } = await supabase.auth.getSession();
  const links: Record<string, string> = {
    starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_LINK ?? "",
    pro: process.env.NEXT_PUBLIC_STRIPE_PRO_LINK ?? "",
  };
  const link = links[planId];
  if (!link) {
    console.warn("Stripe link not configured for plan:", planId);
    return;
  }
  const url = session?.user?.email
    ? `${link}?prefilled_email=${encodeURIComponent(session.user.email)}`
    : link;
  window.location.href = url;
}

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────
type AuthTab = "signin" | "signup";
type ModalId =
  | "leaderboard"
  | "how"
  | "why"
  | "intel"
  | "team"
  | "community"
  | null;

interface Signal {
  id: number;
  label: string;
  base: number;
  variance: number;
  prefix: string;
  suffix: string;
  badge: string;
  badgeColor: string;
  source: string;
}

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { label: "AI Agent Debugging", value: "+890%", sub: "search vol / 18mo" },
  { label: "Webhook Reliability", value: "+287%", sub: "Google Trends / 36mo" },
  { label: "EU AI Act Compliance", value: "HIGH SIGNAL", sub: "" },
  { label: "API Rate Limiting SaaS", value: "+412%", sub: "search vol / 12mo" },
  { label: "B2B No-Code Tools", value: "+63%", sub: "Reddit sentiment" },
  { label: "AI Mock API Server", value: "+195%", sub: "GitHub stars / 6mo" },
  { label: "Micro-SaaS Infra", value: "+78%", sub: "Crunchbase funding" },
  { label: "Postman Alternatives", value: "+340%", sub: "Reddit threads / 90d" },
  { label: "LLM Tool-Use Repos", value: "+312%", sub: "GitHub Octoverse" },
];

const SIGNALS: Signal[] = [
  { id: 0, label: "Webhook Debugging", base: 287, variance: 15, prefix: "+", suffix: "%", badge: "Rising Fast", badgeColor: "em", source: "Google Trends · 36mo" },
  { id: 1, label: "AI Agent Debugging", base: 890, variance: 40, prefix: "+", suffix: "%", badge: "Explosive", badgeColor: "red", source: "Search Volume · 18mo" },
  { id: 2, label: "API Rate Limiting", base: 412, variance: 20, prefix: "+", suffix: "%", badge: "Emerging", badgeColor: "gold", source: "Search Volume · 12mo" },
  { id: 3, label: "Mock API Servers", base: 195, variance: 12, prefix: "+", suffix: "%", badge: "Rising", badgeColor: "em", source: "GitHub Stars · 6mo" },
  { id: 4, label: "Hookdeck Series A", base: 7, variance: 0, prefix: "$", suffix: "M", badge: "Validated", badgeColor: "gold", source: "Crunchbase · 2023" },
];

const TYPEWRITER_PHRASES = [
  "The #1 platform to spot trends and startup ideas worth building.",
  "Find validated niches with real data — not gut instinct.",
  "Institutional-grade market intelligence for independent founders.",
  "Build the right thing. The first time.",
];

const LEADERBOARD = [
  { rank: 1, name: "Webhook Reliability Platform", cat: "Micro-SaaS · Dev Tools", mkt: 84, rev: 78, open: true },
  { rank: 2, name: "AI Mock API Server (Hosted)", cat: "Micro-SaaS · Dev Tools", mkt: 81, rev: 76, open: true },
  { rank: 3, name: "API Breaking Change Monitor", cat: "Micro-SaaS · Infrastructure", mkt: 77, rev: 72, open: true },
  { rank: 4, name: "EU AI Act Compliance Logger", cat: "Compliance · SaaS", mkt: 74, rev: 69, open: true },
  { rank: 5, name: "Rate Limit Management Proxy", cat: "Micro-SaaS · Dev Tools", mkt: 68, rev: 64, open: true },
];

// ─────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.18 } },
};

// ─────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────

/** Animated counter that counts up on mount */
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      className="flex flex-col items-center px-6 py-4 border-r border-zinc-800 last:border-r-0 first:border-l-0"
    >
      <motion.span
        className="font-mono text-2xl font-medium text-white mb-1 tabular-nums"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        {value}
      </motion.span>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
        {label}
      </span>
    </motion.div>
  );
}

/** Score chip */
function ScoreChip({ label, value, hi }: { label: string; value: string; hi?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md font-mono text-[11px]">
      <span className="text-zinc-500">{label}</span>
      <span className={hi ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>{value}</span>
    </span>
  );
}

/** Glow button */
function GlowButton({
  children,
  onClick,
  className = "",
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "ghost";
}) {
  if (variant === "ghost") {
    return (
      <button
        onClick={onClick}
        className={`px-5 py-2.5 rounded-lg text-sm font-semibold border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 transition-all duration-200 ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`relative px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-400 transition-all duration-200 shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_36px_rgba(16,185,129,0.5)] ${className}`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// AUTH MODAL
// ─────────────────────────────────────────────────────────
function AuthModal({
  open,
  onClose,
  defaultTab = "signin",
}: {
  open: boolean;
  onClose: () => void;
  defaultTab?: AuthTab;
}) {
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setTab(defaultTab);
    setError("");
    setSuccess("");
  }, [defaultTab, open]);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleEmailSignIn = async () => {
    setError("");
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Invalid credentials. Try again.");
    else { setSuccess("Signed in! Redirecting…"); setTimeout(() => { window.location.href = "/dashboard"; }, 900); }
    setLoading(false);
  };

  const handleEmailSignUp = async () => {
    setError("");
    if (!email || !password) { setError("Enter your email and choose a password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error) setError(error.message);
    else setSuccess("Account created! Check your email to confirm.");
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[600] flex items-center justify-center p-5"
          initial={{ backdropFilter: "blur(0px)", backgroundColor: "rgba(0,0,0,0)" }}
          animate={{ backdropFilter: "blur(14px)", backgroundColor: "rgba(0,0,0,0.88)" }}
          exit={{ backdropFilter: "blur(0px)", backgroundColor: "rgba(0,0,0,0)" }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[400px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            {/* top gradient line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
            {/* glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-[180px] bg-emerald-500/6 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
              <div className="flex items-center gap-2 font-display font-bold text-sm text-white">
                <span className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center text-[9px] font-mono text-white">NL</span>
                NicheLab
              </div>
              <button onClick={onClose} className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white text-sm transition-colors">✕</button>
            </div>

            <div className="p-5 relative">
              <h2 className="font-display text-[22px] font-black tracking-tight text-white leading-tight mb-1">
                Member<br />
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Access</span>
              </h2>
              <p className="text-sm text-zinc-400 mb-5">Sign in or create a free account to continue.</p>

              {/* Tabs */}
              <div className="flex gap-1.5 mb-5">
                {(["signin", "signup"] as AuthTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium border transition-all ${tab === t ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-zinc-800 text-zinc-500 hover:text-white"}`}
                  >
                    {t === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              {/* Google */}
              <button onClick={handleGoogle} disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-semibold text-white hover:border-zinc-700 transition-all mb-4">
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-px bg-zinc-900" />
                <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">Or email</span>
                <div className="flex-1 h-px bg-zinc-900" />
              </div>

              {/* Form */}
              <div className="flex flex-col gap-3">
                {tab === "signup" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-zinc-400">First</label>
                      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First" className="auth-input" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-zinc-400">Last</label>
                      <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last" className="auth-input" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" className="auth-input" autoComplete="email" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tab === "signup" ? "8+ characters" : "Password"} className="auth-input" autoComplete={tab === "signin" ? "current-password" : "new-password"}
                    onKeyDown={(e) => { if (e.key === "Enter") tab === "signin" ? handleEmailSignIn() : handleEmailSignUp(); }}
                  />
                </div>

                {error && <p className="text-xs text-red-400 px-1">{error}</p>}
                {success && <p className="text-xs text-emerald-400 px-1">{success}</p>}

                <GlowButton
                  onClick={tab === "signin" ? handleEmailSignIn : handleEmailSignUp}
                  className="w-full py-2.5 text-sm"
                >
                  {loading ? "Please wait…" : tab === "signin" ? "Sign in →" : "Create account →"}
                </GlowButton>
              </div>

              {tab === "signup" && (
                <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
                  By creating an account you agree to our Terms of Service and Privacy Policy.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────
// WIDE MODAL WRAPPER
// ─────────────────────────────────────────────────────────
function WideModal({
  open,
  onClose,
  icon,
  title,
  subtitle,
  iconBg,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon: string;
  title: string;
  subtitle: string;
  iconBg: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4"
          initial={{ backdropFilter: "blur(0px)", backgroundColor: "rgba(0,0,0,0)" }}
          animate={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.88)" }}
          exit={{ backdropFilter: "blur(0px)", backgroundColor: "rgba(0,0,0,0)" }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-5xl max-h-[88vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            {/* top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-cyan-400 to-transparent" />

            {/* Modal header */}
            <div className="flex items-center gap-3 px-7 py-5 border-b border-zinc-900 flex-shrink-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[17px] ${iconBg}`}>{icon}</div>
              <div className="flex-1">
                <div className="font-display text-[17px] font-bold text-white">{title}</div>
                <div className="font-mono text-[10px] text-zinc-500 mt-0.5">{subtitle}</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-sm text-zinc-400 hover:text-white transition-colors">✕</button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-7 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────
// MODAL CONTENTS
// ─────────────────────────────────────────────────────────

function LeaderboardModal({ onUpgrade }: { onUpgrade: () => void }) {
  const [filter, setFilter] = useState("all");
  const filters = [
    { id: "all", label: "All" },
    { id: "micro-saas", label: "Micro-SaaS" },
    { id: "dev-tools", label: "Dev Tools" },
    { id: "ai", label: "AI" },
  ];
  const cats: Record<number, string[]> = {
    1: ["micro-saas", "dev-tools"], 2: ["micro-saas", "dev-tools", "ai"],
    3: ["micro-saas", "dev-tools"], 4: ["ai"], 5: ["micro-saas", "dev-tools"],
  };
  const visible = LEADERBOARD.filter((r) => filter === "all" || cats[r.rank]?.includes(filter));

  return (
    <div className="flex flex-col gap-8">
      {/* Filters */}
      <div>
        <SectionTitle>Filter by category</SectionTitle>
        <div className="flex gap-2 flex-wrap mt-3">
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full font-mono text-[10px] font-medium border transition-all ${filter === f.id ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-zinc-800 text-zinc-500 hover:text-white"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-zinc-900">
              <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-zinc-600 text-left w-8">#</th>
              <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-zinc-600 text-left">Idea</th>
              <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-zinc-600 text-center">Mkt</th>
              <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-zinc-600 text-center">Rev</th>
              <th className="pb-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.rank} className="border-b border-zinc-900/60 hover:bg-zinc-900/30 transition-colors">
                <td className={`py-3 font-mono text-sm font-bold ${row.rank <= 3 ? "text-amber-400" : "text-zinc-600"}`}>{row.rank}</td>
                <td className="py-3">
                  <div className="text-sm font-semibold text-white">{row.name}</div>
                  <div className="font-mono text-[9px] text-zinc-500">{row.cat}</div>
                </td>
                <td className="py-3 text-center font-mono text-sm font-medium text-emerald-400">{row.mkt}</td>
                <td className="py-3 text-center font-mono text-sm font-medium text-emerald-400">{row.rev}</td>
                <td className="py-3 text-right">
                  <button className="font-mono text-[10px] px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {/* Locked row */}
            <tr className="opacity-40">
              <td className="py-3 font-mono text-sm text-zinc-600">6–200+</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">Unlock all opportunities</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded">STARTER · $249/yr</span>
                </div>
              </td>
              <td /><td />
              <td className="py-3 text-right">
                <button onClick={onUpgrade} className="font-mono text-[10px] px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors">
                  Upgrade
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CTA */}
      <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-5 text-center">
        <div className="font-display text-lg font-bold text-white mb-1">200+ opportunities waiting</div>
        <p className="text-sm text-zinc-400 mb-4">Unlock the full leaderboard, competitor maps, and financial projections.</p>
        <GlowButton onClick={onUpgrade} className="px-6 py-2.5">Unlock full access · $249/yr →</GlowButton>
      </div>
    </div>
  );
}

function HowModal() {
  const steps = [
    { n: "01", title: "Signal Capture", sub: "47 live data sources", desc: "Reddit threads, Google Trends, GitHub star velocity, Crunchbase funding rounds, G2 review sentiment, Hacker News threads, Product Hunt launches, SEC regulatory filings — monitored continuously." },
    { n: "02", title: "Opportunity Scoring", sub: "5-dimension model, 0–100", desc: "Market Size (TAM/SAM/SOM), Revenue Potential, Competition Level, Build Difficulty, and Signal Strength. Every score is backed by cited evidence, not opinions." },
    { n: "03", title: "Detailed Reports", sub: "200+ hours → 15 minutes", desc: "Each report: executive summary, market sizing with sources, 3–5 competitor teardowns, revenue model options, founder-fit assessment, risk matrix, 30-day execution plan. PDF export for Starter+ members." },
    { n: "04", title: "Execute", sub: "Actionable from day one", desc: "Every report ends with a specific 30-day action plan and conservative/base/optimistic MRR projections at months 3, 6, and 12. Know what to build, why it works, and how to start — today." },
  ];
  const after = [
    { n: "1", title: "Instant access to the full archive", desc: "All 200+ existing reports unlock immediately. Browse by category, score, build time, or revenue potential." },
    { n: "2", title: "Weekly trend alert digest", desc: "Every Friday: the top 3 emerging signals from the past 7 days, with early-stage opportunity scores before they become public reports." },
    { n: "3", title: "New report every weekday", desc: "A new analysis published each working day. 200+ hours of original research at your fingertips in 15 minutes." },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionTitle>The four-stage pipeline</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {steps.map((s) => (
            <div key={s.n} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="font-mono text-[10px] text-emerald-400 mb-1">{s.n} ·</div>
              <div className="text-sm font-bold text-white mb-0.5">{s.title}</div>
              <div className="font-mono text-[10px] text-zinc-500 mb-3">{s.sub}</div>
              <p className="text-[12.5px] text-zinc-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>What happens after you subscribe</SectionTitle>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mt-4 flex flex-col gap-4">
          {after.map((a) => (
            <div key={a.n} className="flex gap-4 items-start">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center font-mono text-[10px] text-emerald-400 flex-shrink-0 mt-0.5">{a.n}</div>
              <div>
                <div className="text-sm font-semibold text-white mb-0.5">{a.title}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhyModal() {
  const conventional = [
    "Browse Twitter for hot takes and gut feelings about "trending" markets",
    "Ask an LLM to brainstorm ideas from thin air — no sourcing, no evidence",
    "Spend 3–6 months on manual, unverified research across fragmented sources",
    "Trust a podcast guest's market size assumptions without methodology",
    "Hope your instinct aligns with actual, measurable demand",
    "Competitor "research" based on a quick Product Hunt scroll",
  ];
  const nichelab = [
    "47 monitored real-world data sources with automated freshness validation",
    "Every claim cited — Reddit, Google Trends, Crunchbase, G2 reviews",
    "200+ hours of structured research condensed to a 15-minute read",
    "Investment-grade TAM/SAM/SOM with methodology and primary sources",
    "Specific 30-day execution plan with revenue benchmarks per opportunity",
    "Full competitor gap analysis: where they end, where your product begins",
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionTitle>Side-by-side comparison</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-3 pb-2 border-b border-zinc-800">Conventional approach</div>
            <div className="flex flex-col gap-3">
              {conventional.map((item, i) => (
                <div key={i} className="flex gap-2.5 items-start text-xs text-zinc-500">
                  <span className="text-red-500 font-bold flex-shrink-0 mt-0.5">✕</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-3 pb-2 border-b border-emerald-500/25">NicheLab</div>
            <div className="flex flex-col gap-3">
              {nichelab.map((item, i) => (
                <div key={i} className="flex gap-2.5 items-start text-xs text-zinc-300">
                  <span className="text-emerald-400 font-bold flex-shrink-0 mt-0.5">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        <SectionTitle>The cost of getting it wrong</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-sm font-bold text-red-400 mb-2">Building on bad signal</div>
            <p className="text-xs text-zinc-400 leading-relaxed">The average solo founder spends 4–8 months building before discovering product-market fit issues. At a conservative $6,000/mo opportunity cost, that's $24K–$48K in unrealised income — before counting development costs.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-sm font-bold text-emerald-400 mb-2">Building on validated signal</div>
            <p className="text-xs text-zinc-400 leading-relaxed">NicheLab customers report an average of 3.2 validated opportunities identified before committing to build. Each report contains a risk matrix that identifies the top 3 ways the opportunity could fail — before you've written a line of code.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelModal({ onUpgrade }: { onUpgrade: () => void }) {
  const sources = [
    { name: "Bloomberg Terminal", val: "$27,000/yr" },
    { name: "CB Insights Enterprise", val: "$15,000/yr" },
    { name: "Gartner Research", val: "$30,000/yr" },
    { name: "PitchBook Platform", val: "$24,000/yr" },
    { name: "McKinsey Reports (avg 4)", val: "$22,000/yr" },
    { name: "Euromonitor Passport", val: "$18,400/yr" },
  ];
  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">NicheLab draws on the same categories of research signals used across institutional market intelligence environments — hedge funds, global strategy consultancies, and sovereign wealth organisations. At a fundamentally different price point.</p>

      <div className="bg-gradient-to-br from-emerald-500/8 to-cyan-500/5 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-end justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Combined institutional list price</div>
          <div className="font-display text-5xl font-black text-emerald-400 tracking-tighter leading-none">$147,400</div>
          <div className="font-mono text-[11px] text-zinc-500 mt-1">per year across source categories</div>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400 mb-3 max-w-[200px] leading-relaxed">NicheLab synthesises intelligence drawn from these categories at a fraction of the cost.</p>
          <GlowButton onClick={onUpgrade}>Starter · $249/yr →</GlowButton>
        </div>
      </div>

      <div>
        <SectionTitle>Source category breakdown</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {sources.map((s) => (
            <div key={s.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-sm font-semibold text-white mb-1">{s.name}</div>
              <div className="font-mono text-[11px] text-emerald-400">{s.val}</div>
            </div>
          ))}
        </div>
        <p className="font-mono text-[10px] text-zinc-600 mt-4 p-3 border border-zinc-900 rounded-lg leading-relaxed">All outputs represent synthesised inference and do not constitute sublicensed reproduction of any proprietary data infrastructure. Figures provided for illustrative reference only.</p>
      </div>
    </div>
  );
}

function TeamModal() {
  const team = [
    { color: "border-emerald-500", role: "Strategy & Market Intelligence Lead", tags: "McKinsey-tier · Market entry · EMEA/APAC · Wharton MBA", desc: "Former engagement manager at a global top-3 strategy consultancy. Led market entry and competitive intelligence projects across 12 markets in EMEA and APAC. Wharton MBA. Built the scoring methodology that underlies every NicheLab report." },
    { color: "border-cyan-400", role: "Venture & Startup Intelligence", tags: "Tier 1 VC · 400+ startups/yr · Big Four · LBS", desc: "Former analyst at a Tier 1 VC fund. Evaluated 400+ startups annually across SaaS, fintech, and consumer. Prior stint at PwC Deals. London Business School. Designed the revenue potential and competitor gap frameworks." },
    { color: "border-violet-500", role: "Data & Product Architecture", tags: "Signal systems · Series B fintech · Institutional · MIT CS", desc: "Previously led data products at a Series B fintech. Built market signal pipelines used by institutional clients across 8 markets. MIT Computer Science. Designed the 47-source data infrastructure NicheLab runs on." },
    { color: "border-amber-400", role: "Editorial & Research Standards", tags: "Think tank · HBR published · FT · The Economist · Oxford PPE", desc: "Former researcher at a top-5 global think tank. Published in FT, The Economist, and Harvard Business Review. Oxford PPE. Sets the citation standards and editorial rigour that distinguishes NicheLab from AI-generated content." },
  ];

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">NicheLab was not built by people who simply read about markets. It was built around the perspective of those who spent years working within them. Team members are not publicly named by choice. In a market intelligence business, the methodology matters more than the biography.</p>

      <div>
        <SectionTitle>The team</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {team.map((m) => (
            <div key={m.role} className={`bg-zinc-900 border border-zinc-800 border-l-2 ${m.color} rounded-xl p-5`}>
              <div className="font-mono text-[10px] text-zinc-500 mb-2">{m.role}</div>
              <p className="text-[12.5px] text-zinc-400 leading-relaxed mb-3">{m.desc}</p>
              <div className="font-mono text-[9px] text-zinc-600">{m.tags}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Written correspondence</SectionTitle>
        <form
          action="https://formspree.io/f/mwvrzqld"
          method="POST"
          className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mt-4"
        >
          <input type="hidden" name="_subject" value="New NicheLab enquiry" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-400">First name</label>
              <input name="first_name" placeholder="First name" className="form-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-400">Last name</label>
              <input name="last_name" placeholder="Last name" className="form-input" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400">Email address</label>
              <input name="email" type="email" placeholder="you@domain.com" className="form-input" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400">Enquiry type</label>
              <select name="subject" className="form-input">
                <option value="">Select enquiry type</option>
                <option>General enquiry</option>
                <option>Membership & billing</option>
                <option>Partnership</option>
                <option>Press & media</option>
                <option>Research request</option>
                <option>Legal & compliance</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400">Message</label>
              <textarea name="message" placeholder="Describe your enquiry in detail." rows={4} className="form-input resize-none" />
            </div>
            <div className="sm:col-span-2">
              <GlowButton className="w-full py-2.5">Submit enquiry</GlowButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CommunityModal({ onOpenAuth }: { onOpenAuth: (tab: AuthTab) => void }) {
  const testimonials = [
    { stars: 5, text: "NicheLab is what idea research should look like for serious builders. The competitor maps alone save weeks.", name: "Alex Kim", role: "Solo founder · $8K MRR" },
    { stars: 5, text: "The TAM/SAM/SOM section gave me language I could use directly in an investor deck. First time I didn't have to justify my market size from scratch.", name: "James Müller", role: "Founder · Pre-seed funded" },
    { stars: 5, text: "Found a micro-SaaS gap in legal document automation I'd been researching 6 months. NicheLab surfaced it in one analysis.", name: "Solo founder, 2nd exit", role: "Micro-SaaS · Legal Tech · Pro" },
    { stars: 5, text: "Three months in. Found two opportunities I'm actively building. One is already at $1,400 MRR. Live in 22 days.", name: "Indie hacker, 4 products live", role: "Starter plan" },
    { stars: 5, text: "The risk matrix changed my mind about a market that looked attractive on the surface. Saved me 14 months of the wrong thing.", name: "Marcus Chen", role: "Founder · 3 exits" },
    { stars: 5, text: "The research has the tone of something built by people who have actually sat inside funds and strategy firms. It shows.", name: "Elena Petrova", role: "Angel investor" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionTitle>What members say</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="text-amber-400 text-[11px] tracking-widest mb-2">{"★".repeat(t.stars)}</div>
              <p className="text-[12.5px] text-zinc-400 leading-relaxed mb-3">"{t.text}"</p>
              <div className="text-sm font-semibold text-white">{t.name}</div>
              <div className="font-mono text-[10px] text-zinc-500">{t.role}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>Join the community</SectionTitle>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mt-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <div className="font-display text-base font-bold text-white mb-1">1,240+ independent builders</div>
            <p className="text-sm text-zinc-400">Create a free account to access saved ideas, member reports, and the full leaderboard.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <GlowButton variant="ghost" onClick={() => onOpenAuth("signin")}>Sign in</GlowButton>
            <GlowButton onClick={() => onOpenAuth("signup")}>Join free →</GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SECTION TITLE HELPER
// ─────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{children}</span>
      <div className="flex-1 h-px bg-zinc-900" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// HUB ENTRY CARD
// ─────────────────────────────────────────────────────────
function HubCard({
  icon,
  iconBg,
  title,
  sub,
  desc,
  chips,
  onClick,
}: {
  icon: string;
  iconBg: string;
  title: string;
  sub: string;
  desc: string;
  chips: { label: string; color: string }[];
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="text-left bg-zinc-950 border border-zinc-800 rounded-2xl p-6 cursor-pointer hover:border-zinc-700 hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)] transition-all duration-200 flex flex-col gap-4 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] ${iconBg}`}>{icon}</div>
          <div>
            <div className="font-display text-[15px] font-bold text-white leading-tight">{title}</div>
            <div className="font-mono text-[10px] text-zinc-500 mt-0.5">{sub}</div>
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg border border-zinc-800 flex items-center justify-center text-sm text-zinc-600 group-hover:border-emerald-500/30 group-hover:text-emerald-400 group-hover:bg-emerald-500/8 transition-all flex-shrink-0 translate-x-0 group-hover:translate-x-0.5">
          ›
        </div>
      </div>
      <p className="text-[12.5px] text-zinc-500 leading-relaxed">{desc}</p>
      <div className="flex gap-1.5 flex-wrap">
        {chips.map((c) => (
          <span key={c.label} className={`font-mono text-[9px] px-2 py-0.5 rounded font-medium ${c.color}`}>{c.label}</span>
        ))}
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────
// GOOGLE ICON
// ─────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────
export default function NicheLabHome() {
  // ── State
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("signin");
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [ctaEmail, setCtaEmail] = useState("");

  // Typewriter
  const [typeText, setTypeText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  // Live signals
  const [signalValues, setSignalValues] = useState(SIGNALS.map((s) => s.base));

  // Live counters (authority numbers)
  const [nichesFound, setNichesFound] = useState(1_420);
  const [buildersActive, setBuildersActive] = useState(1_240);

  // ── Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && authOpen) {
        setTimeout(() => { window.location.href = "/dashboard"; }, 600);
      }
    });
    return () => subscription.unsubscribe();
  }, [authOpen]);

  // ── Typewriter
  useEffect(() => {
    const phrase = TYPEWRITER_PHRASES[phraseIdx];
    const delay = deleting ? 22 : charIdx === phrase.length ? 2600 : 46;
    const timer = setTimeout(() => {
      if (!deleting && charIdx === phrase.length) { setDeleting(true); return; }
      if (deleting && charIdx === 0) {
        setDeleting(false);
        setPhraseIdx((p) => (p + 1) % TYPEWRITER_PHRASES.length);
        return;
      }
      setCharIdx((c) => c + (deleting ? -1 : 1));
      setTypeText(phrase.slice(0, charIdx + (deleting ? -1 : 1)));
    }, delay);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, phraseIdx]);

  // ── Signal refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setSignalValues((prev) =>
        prev.map((v, i) => {
          const s = SIGNALS[i];
          return s.variance ? s.base + Math.round((Math.random() - 0.5) * s.variance) : v;
        })
      );
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // ── Live counters
  useEffect(() => {
    const interval = setInterval(() => {
      setNichesFound((n) => n + Math.floor(Math.random() * 3));
      if (Math.random() < 0.1) setBuildersActive((b) => b + 1);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  // ── Helpers
  const openAuth = useCallback((tab: AuthTab = "signin") => {
    setAuthTab(tab);
    setAuthOpen(true);
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const badgeClasses: Record<string, string> = {
    em: "bg-emerald-500/10 text-emerald-400",
    red: "bg-red-500/10 text-red-400",
    gold: "bg-amber-500/10 text-amber-400",
    cy: "bg-cyan-500/10 text-cyan-400",
  };

  const signalColor = (s: Signal, i: number) => {
    if (i === 4) return "text-amber-400";
    return "text-emerald-400";
  };

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <>
      {/* ── GLOBAL STYLES (injected via style tag — move to globals.css in production) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=JetBrains+Mono:wght@300;400;500&display=swap');
        :root { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .auth-input, .form-input {
          width: 100%;
          padding: 10px 12px;
          background: rgb(24 24 27);
          border: 1px solid rgb(39 39 42);
          border-radius: 10px;
          color: white;
          font-size: 13px;
          outline: none;
          transition: border-color 0.18s;
          font-family: 'DM Sans', sans-serif;
        }
        .auth-input::placeholder, .form-input::placeholder { color: rgb(63 63 70); }
        .auth-input:focus, .form-input:focus { border-color: rgba(16,185,129,0.4); }
        select.form-input { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2352525b'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; appearance: none; }
        select.form-input option { background: rgb(24 24 27); }
        textarea.form-input { resize: vertical; }
        .ticker-track { display: flex; animation: ticker 52s linear infinite; width: max-content; }
        .ticker-track:hover { animation-play-state: paused; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .caret { display: inline-block; width: 2px; height: 1em; background: #10b981; vertical-align: -0.1em; margin-left: 2px; animation: blink 1s steps(1,end) infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        body.modal-open { overflow: hidden; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-track-zinc-900::-webkit-scrollbar-track { background: rgb(24 24 27); }
        .scrollbar-thumb-zinc-700::-webkit-scrollbar-thumb { background: rgb(63 63 70); border-radius: 2px; }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform: scale(1); } 50% { opacity:0.3; transform: scale(0.8); } }
        .pulse-dot { animation: pulse-dot 2s infinite; }
        @keyframes flash-bar { 0% { transform: scaleX(0); opacity:1; } 80% { transform: scaleX(1); opacity:1; } 100% { transform: scaleX(1); opacity:0; } }
      `}</style>

      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.04),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(34,211,238,0.025),transparent)]" />
          <div className="absolute inset-0 opacity-[0.022]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }} />
        </div>

        {/* ── NAV */}
        <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-900 px-6 md:px-10 h-14 flex items-center gap-4">
          <button onClick={() => scrollTo("top")} className="flex items-center gap-2 font-display font-bold text-[15px] text-white mr-auto">
            <span className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center font-mono text-[9px] text-white flex-shrink-0">NL</span>
            NicheLab
          </button>
          <div className="hidden md:flex items-center gap-0.5">
            {["ideas", "signals", "pricing"].map((id) => (
              <button key={id} onClick={() => scrollTo(id)} className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-white capitalize transition-colors">
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <GlowButton variant="ghost" onClick={() => openAuth("signin")} className="text-[13px] px-4 py-1.5">
              Member Access
            </GlowButton>
            <GlowButton onClick={() => scrollTo("pricing")} className="text-[13px] px-4 py-1.5">
              Start free →
            </GlowButton>
          </div>
        </nav>

        {/* ── HERO */}
        <section id="top" className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pt-20 pb-16 text-center">
          {/* Search bar / typewriter */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="flex items-center gap-3 bg-white rounded-[999px] px-5 py-3 shadow-[0_0_0_1px_rgba(16,185,129,0.1),0_16px_48px_rgba(16,185,129,0.08)]">
              <span className="text-zinc-400 text-base flex-shrink-0">⌕</span>
              <span className="text-zinc-800 text-[14px] font-medium flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                {typeText}<span className="caret" />
              </span>
            </div>
          </motion.div>

          {/* Eyebrow */}
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/20 rounded-full font-mono text-[11px] text-emerald-400 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
            Report #184 published today · Webhook Reliability Platform
          </motion.div>

          {/* H1 */}
          <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible"
            className="font-display text-[clamp(46px,7vw,88px)] font-black tracking-[-0.035em] leading-[1.06] mb-5 text-white">
            The market already signals<br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">what to build.</span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible"
            className="text-lg text-zinc-400 max-w-[640px] mx-auto mb-10 leading-[1.8] font-light">
            NicheLab analyses signals from online communities, search trends, funding activity and competitive gaps — condensed into{" "}
            <strong className="text-white font-medium">structured opportunity reports for independent builders.</strong>
          </motion.p>

          {/* Actions */}
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
            className="flex items-center justify-center gap-3 mb-14 flex-wrap">
            <GlowButton onClick={() => scrollTo("ideas")} className="px-6 py-3 text-[15px]">
              Read today's analysis →
            </GlowButton>
            <GlowButton variant="ghost" onClick={() => scrollTo("pricing")} className="px-6 py-3 text-[15px]">
              Browse 200+ opportunities
            </GlowButton>
          </motion.div>

          {/* Live counter strip */}
          <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible"
            className="flex items-center justify-center gap-4 mb-8 text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
              <span className="text-emerald-400 font-medium tabular-nums">{nichesFound.toLocaleString()}</span> niche gaps found
            </span>
            <span className="text-zinc-800">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-white font-medium tabular-nums">{buildersActive.toLocaleString()}</span> active builders
            </span>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 border border-zinc-900 rounded-2xl overflow-hidden">
            {[
              { v: "1,240+", l: "Active builders" },
              { v: "200+", l: "Opportunity analyses" },
              { v: "30+", l: "Countries global" },
              { v: "24h", l: "Research turnaround" },
            ].map((s, i) => (
              <AnimatedStat key={i} value={s.v} label={s.l} />
            ))}
          </motion.div>
        </section>

        {/* ── TICKER */}
        <div className="relative border-t border-b border-zinc-900 bg-zinc-950 py-2.5 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-6 font-mono text-[11px] whitespace-nowrap border-r border-zinc-900">
                <span className="text-zinc-500">{item.label}</span>
                <span className="text-emerald-400 font-medium">{item.value}</span>
                {item.sub && <span className="text-zinc-600 text-[10px]">{item.sub}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── IDEA OF THE DAY */}
        <section id="ideas" className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pt-16 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Idea of the day</span>
            <div className="flex-1 h-px bg-zinc-900" />
            <span className="font-mono text-[10px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">New Today</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            {/* top gradient */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-cyan-400 to-transparent" />

            {/* Head */}
            <div className="flex gap-5 items-start p-7 border-b border-zinc-900">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[22px] flex-shrink-0">🔗</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Micro-SaaS · Dev Tools</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded">High Signal</span>
                </div>
                <div className="font-display text-xl font-bold tracking-tight mb-2">Webhook Reliability Platform for Indie Developers</div>
                <p className="text-[13px] text-zinc-400 leading-relaxed max-w-2xl">Production-grade webhook management for teams that can't afford Datadog but can't afford downtime. Capture, debug, replay, and monitor every webhook event across your entire SaaS stack — in one place, under $80/month.</p>
                <div className="flex gap-2 flex-wrap mt-3">
                  <ScoreChip label="Market" value="84/100" hi />
                  <ScoreChip label="Revenue" value="78/100" hi />
                  <ScoreChip label="Competition" value="61/100" />
                  <ScoreChip label="Difficulty" value="42/100" hi />
                  <ScoreChip label="MVP Time" value="10–14 wks" />
                  <ScoreChip label="TAM" value="$7.0B" hi />
                  <ScoreChip label="CAGR" value="18.2%" hi />
                </div>
              </div>
            </div>

            {/* Body: 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-900">
              {/* Why now */}
              <div className="p-6">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-4">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />Why now
                </div>
                <div className="text-[12.5px] text-zinc-400 leading-relaxed space-y-3">
                  <p>Postman restricted its free tier in May 2023, triggering a developer exodus. <strong className="text-white font-medium">Hoppscotch gained 25,000 GitHub stars in 6 months</strong> from that backlash — but no one captured the hosted webhook infrastructure market Postman vacated.</p>
                  <p>AI agents calling external APIs are exploding. <strong className="text-white font-medium">"AI agent debugging" queries up 890%</strong> in 18 months. Incumbent tools weren't designed for this use case. The window is 6–9 months wide.</p>
                </div>
              </div>

              {/* Proof signals */}
              <div className="p-6">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-4">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />Proof signals
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { val: "+287%", text: 'growth in "webhook debugging" searches over 36 months (Google Trends)' },
                    { val: "$7M Series A", text: "Hookdeck raised in 2023 — validates commercial model" },
                    { val: "$15K–$20K MRR", text: "Webhook.site founder disclosed with a simpler product" },
                    { val: "847 upvotes", text: 'Reddit r/webdev "Postman is dead to me": 400+ comments' },
                    { val: "Article 12", text: "EU AI Act mandates API audit logs — compliance demand incoming" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px]">
                      <span className="w-1 h-1 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
                      <span className="text-zinc-400"><em className="not-italic text-cyan-400 font-semibold">{item.val}</em> {item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution */}
              <div className="p-6">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-4">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />30-day execution plan
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { n: 1, t: 'Interview 20 engineers. Ask: <b>"What\'s most frustrating about webhook integrations?"</b> Do NOT pitch.' },
                    { n: 2, t: 'Ship landing page: <b>"Never lose a webhook event again."</b> Target 200 signups from HN + Reddit.' },
                    { n: 3, t: "Map where <b>Webhook.site ends and Hookdeck begins.</b> That $29–$79 gap is your product." },
                    { n: 4, t: "Price at <b>$29/mo Developer · $79/mo Team</b> from day one. No launch discounts." },
                    { n: 5, t: "Ship <b>npx hookbase listen</b> CLI. Every run auto-creates a free account — your PLG engine." },
                  ].map((step) => (
                    <div key={step.n} className="flex items-start gap-2.5 text-[12px]">
                      <div className="w-4 h-4 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono text-[9px] text-zinc-500 flex-shrink-0 mt-0.5">{step.n}</div>
                      <span className="text-zinc-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: step.t.replace(/<b>/g, '<strong class="text-white font-medium">').replace(/<\/b>/g, '</strong>') }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-7 py-4 flex-wrap border-t border-zinc-900">
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500 mr-auto flex-wrap gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  10–14 week solo build
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[11px] font-medium">$12,600 MRR at Month 12 (Base Case)</span>
              </div>
              <div className="flex gap-2">
                <button className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all">Save idea</button>
                <button onClick={() => openAuth("signup")} className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/18 transition-all">Open full report →</button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── LIVE SIGNALS */}
        <section id="signals" className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Live market signals</span>
            <div className="flex-1 h-px bg-zinc-900" />
            <span className="font-mono text-[10px] px-2 py-0.5 bg-cyan-500/8 border border-cyan-500/20 text-cyan-400 rounded">Auto-refreshing</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {SIGNALS.map((s, i) => (
              <motion.div
                key={s.id}
                className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-center relative overflow-hidden hover:border-zinc-800 transition-colors"
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 12 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  key={signalValues[i]}
                  className={`font-mono text-[22px] font-medium leading-none mb-1 tabular-nums ${signalColor(s, i)}`}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {s.prefix}{signalValues[i]}{s.suffix}
                </motion.div>
                <div className="text-[11px] text-zinc-300 font-medium mb-0.5">{s.label}</div>
                <div className="font-mono text-[9px] text-zinc-600 mb-2">{s.source}</div>
                <span className={`inline-block font-mono text-[9px] px-2 py-0.5 rounded-full font-medium ${badgeClasses[s.badgeColor]}`}>{s.badge}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── PRICING */}
        <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pt-8 pb-12">
          <div className="flex items-center gap-3 mb-5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Pricing</span>
            <div className="flex-1 h-px bg-zinc-900" />
          </div>
          <p className="text-[14px] text-zinc-400 max-w-xl mb-8 leading-[1.75]">
            Each report represents 200+ hours of structured market research. At $249/year for 200+ reports, you're paying{" "}
            <strong className="text-white">$1.24 per validated opportunity.</strong>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} viewport={{ once: true }} transition={{ duration: 0.45 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all">
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Free</div>
              <div className="font-display text-[38px] font-black tracking-tight leading-none mb-0.5">$0</div>
              <div className="text-xs text-zinc-500 mb-5">forever · no card required</div>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-5 pb-4 border-b border-zinc-900">Explore NicheLab before committing. Read today's featured report in preview mode. See the leaderboard top 5.</p>
              <div className="flex flex-col gap-2.5 mb-6">
                {[
                  { on: true, t: "Daily featured report (preview)" },
                  { on: true, t: "Score dashboard (5 metrics)" },
                  { on: true, t: "Leaderboard top 5" },
                  { on: false, t: "Detailed full reports" },
                  { on: false, t: "Competitor intelligence" },
                  { on: false, t: "Custom research generation" },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-[13px]">
                    <div className={`w-[15px] h-[15px] rounded mt-0.5 flex items-center justify-center text-[9px] flex-shrink-0 ${f.on ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-zinc-900 border border-zinc-800 text-zinc-600"}`}>{f.on ? "✓" : "–"}</div>
                    <span className={f.on ? "text-zinc-300" : "text-zinc-600"}>{f.t}</span>
                  </div>
                ))}
              </div>
              <GlowButton variant="ghost" onClick={() => openAuth("signup")} className="w-full py-2.5 text-[13px]">Browse free access</GlowButton>
            </motion.div>

            {/* Starter (Featured) */}
            <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.07 }}
              className="relative bg-gradient-to-b from-emerald-500/5 to-zinc-950 border border-emerald-500/25 rounded-2xl p-7 overflow-hidden">
              <div className="absolute top-3 right-3 font-mono text-[9px] px-2 py-0.5 bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 rounded-full tracking-widest">Most Popular</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Starter</div>
              <div className="font-display text-[38px] font-black tracking-tight leading-none mb-0.5 text-emerald-400">$249</div>
              <div className="text-xs text-zinc-500 mb-5">/year · billed annually <span className="text-emerald-400 font-semibold">(save 17%)</span></div>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-5 pb-4 border-b border-emerald-500/10">Full access to every report in the database. Opportunity leaderboard. Trend alerts. <strong className="text-emerald-400">$1.24 per validated opportunity.</strong></p>
              <div className="flex flex-col gap-2.5 mb-6">
                {["200+ detailed full reports", "Leaderboard + weekly trend alerts", "Competitor intel per report", "Founder-fit assessment", "PDF export per report"].map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-[13px]">
                    <div className="w-[15px] h-[15px] rounded mt-0.5 flex items-center justify-center text-[9px] flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">✓</div>
                    <span className="text-zinc-300">{f}</span>
                  </div>
                ))}
                <div className="flex items-start gap-2 text-[13px]">
                  <div className="w-[15px] h-[15px] rounded mt-0.5 flex items-center justify-center text-[9px] flex-shrink-0 bg-zinc-900 border border-zinc-800 text-zinc-600">–</div>
                  <span className="text-zinc-600">Custom report generation</span>
                </div>
              </div>
              <GlowButton onClick={() => handleCheckout("starter")} className="w-full py-2.5 text-[13px]">Choose Starter →</GlowButton>
            </motion.div>

            {/* Pro */}
            <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.14 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all">
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Pro</div>
              <div className="font-display text-[38px] font-black tracking-tight leading-none mb-0.5">$899</div>
              <div className="text-xs text-zinc-500 mb-5">/year · billed annually</div>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-5 pb-4 border-b border-zinc-900">Everything in Starter, plus on-demand custom research within 24 hours for any niche, category, or region.</p>
              <div className="flex flex-col gap-2.5 mb-6">
                {["Everything in Starter", "12 custom deep-dive reports/year", "Financial model exports (Excel)", "Early access to new tools", "Founder community access", "Priority support"].map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-[13px]">
                    <div className="w-[15px] h-[15px] rounded mt-0.5 flex items-center justify-center text-[9px] flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">✓</div>
                    <span className="text-zinc-300">{f}</span>
                  </div>
                ))}
              </div>
              <GlowButton variant="ghost" onClick={() => handleCheckout("pro")} className="w-full py-2.5 text-[13px]">Choose Pro</GlowButton>
            </motion.div>
          </div>
        </section>

        {/* ── CTA BLOCK */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pb-12">
          <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55 }}
            className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-14 text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-emerald-500/6 rounded-full blur-3xl pointer-events-none" />
            <h2 className="relative font-display text-[clamp(32px,4vw,52px)] font-black tracking-tight leading-[1.06] mb-4">
              Stop building on <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">assumptions.</span>
            </h2>
            <p className="relative text-[15px] text-zinc-400 max-w-md mx-auto mb-8 leading-[1.7]">Read today's opportunity report free. No credit card. No pitch. Just data-backed intelligence on a market that's ready to be built.</p>
            <div className="relative flex items-center justify-center gap-2 flex-wrap max-w-sm mx-auto mb-3">
              <input
                type="email"
                value={ctaEmail}
                onChange={(e) => setCtaEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 min-w-[180px] px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[13px] text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40 transition-colors font-sans"
              />
              <GlowButton
                onClick={() => {
                  if (!ctaEmail || !ctaEmail.includes("@")) return;
                  openAuth("signup");
                  setTimeout(() => {
                    const el = document.getElementById("am-signup-email") as HTMLInputElement;
                    if (el) el.value = ctaEmail;
                  }, 350);
                }}
                className="py-3 px-5 text-[13px] whitespace-nowrap"
              >
                Get free report →
              </GlowButton>
            </div>
            <div className="relative font-mono text-[10px] text-zinc-600">1,240+ builders already inside · Unsubscribe anytime</div>
          </motion.div>
        </div>

        {/* ── CURIOSITY HUB */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pb-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Explore more</span>
            <div className="flex-1 h-px bg-zinc-900" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <HubCard icon="🏆" iconBg="bg-emerald-500/10 border border-emerald-500/20" title="Opportunity Leaderboard" sub="Top 200+ validated ideas · March 2026"
              desc="Every validated market opportunity ranked by composite score — market size, revenue potential, build difficulty, and signal strength. Updated weekly."
              chips={[{ label: "200+ ideas", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" }, { label: "Filtered by category", color: "bg-zinc-900 text-zinc-500 border border-zinc-800" }]}
              onClick={() => setActiveModal("leaderboard")} />
            <HubCard icon="📡" iconBg="bg-cyan-500/10 border border-cyan-500/20" title="How it Works" sub="Signal capture → Scoring → Reports"
              desc="47 live data sources. A five-dimension scoring model. 15-minute reports with 30-day action plans. Here's the full methodology behind every number."
              chips={[{ label: "4 stages", color: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" }, { label: "47 sources", color: "bg-zinc-900 text-zinc-500 border border-zinc-800" }]}
              onClick={() => setActiveModal("how")} />
            <HubCard icon="⚖️" iconBg="bg-amber-500/10 border border-amber-500/20" title="Why NicheLab" sub="Data, not opinions — the difference"
              desc="The honest comparison between conventional research and what NicheLab delivers. Cited evidence vs. gut instinct. Investment-grade TAM vs. Twitter threads."
              chips={[{ label: "Side-by-side", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" }]}
              onClick={() => setActiveModal("why")} />
            <HubCard icon="🧠" iconBg="bg-violet-500/10 border border-violet-500/20" title="Intelligence Infrastructure" sub="Where the signal comes from"
              desc="The same research categories used by hedge funds, strategy consultancies, and sovereign wealth organisations — synthesised at a different price point."
              chips={[{ label: "$147,400 list value", color: "bg-violet-500/10 text-violet-400 border border-violet-500/20" }]}
              onClick={() => setActiveModal("intel")} />
            <HubCard icon="🔒" iconBg="bg-zinc-800 border border-zinc-700" title="Who is Behind This" sub="Built by people who have been inside"
              desc="NicheLab wasn't built by people who read about markets. It was built by those who spent years working inside them — strategy consultancies, Tier 1 VC, think tanks."
              chips={[{ label: "4 specialists", color: "bg-zinc-900 text-zinc-500 border border-zinc-800" }, { label: "Contact form", color: "bg-zinc-900 text-zinc-500 border border-zinc-800" }]}
              onClick={() => setActiveModal("team")} />
            <HubCard icon="💬" iconBg="bg-red-500/10 border border-red-500/20" title="Community Hub" sub="What our members say"
              desc="1,240+ builders have used NicheLab to validate ideas, pivot markets, and find winning niches. Here's what they've said — and how to join them."
              chips={[{ label: "1,240+ members", color: "bg-red-500/10 text-red-400 border border-red-500/20" }, { label: "Sign in / Join", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" }]}
              onClick={() => setActiveModal("community")} />
          </div>
        </div>

        {/* ── FOOTER */}
        <footer className="border-t border-zinc-900 relative z-10">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 font-display font-semibold text-[14px] text-white">
              <span className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center font-mono text-[8px]">NL</span>
              <div>
                <div>NicheLab</div>
                <div className="text-[11px] text-zinc-500 font-normal mt-px">nichelab.io</div>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-zinc-500 flex-wrap">
              {["Reports", "Signals", "Pricing"].map((l) => (
                <button key={l} onClick={() => scrollTo(l.toLowerCase())} className="hover:text-white transition-colors">{l}</button>
              ))}
            </div>
            <div className="font-mono text-[11px] text-zinc-600">© 2026 NicheLab · All rights reserved</div>
          </div>
        </footer>
      </div>

      {/* ── AUTH MODAL */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />

      {/* ── WIDE MODALS */}
      <WideModal open={activeModal === "leaderboard"} onClose={() => setActiveModal(null)}
        icon="🏆" title="Opportunity Leaderboard" subtitle="Top 200+ validated ideas · Ranked by composite score · March 2026"
        iconBg="bg-emerald-500/10 border border-emerald-500/20">
        <LeaderboardModal onUpgrade={() => { setActiveModal(null); handleCheckout("starter"); }} />
      </WideModal>

      <WideModal open={activeModal === "how"} onClose={() => setActiveModal(null)}
        icon="📡" title="How it Works" subtitle="Signal capture → Opportunity scoring → Structured reports → Execution"
        iconBg="bg-cyan-500/10 border border-cyan-500/20">
        <HowModal />
      </WideModal>

      <WideModal open={activeModal === "why"} onClose={() => setActiveModal(null)}
        icon="⚖️" title="Why NicheLab" subtitle="Data, not opinions — the substantive difference"
        iconBg="bg-amber-500/10 border border-amber-500/20">
        <WhyModal />
      </WideModal>

      <WideModal open={activeModal === "intel"} onClose={() => setActiveModal(null)}
        icon="🧠" title="Intelligence Infrastructure" subtitle="Where the signal comes from"
        iconBg="bg-violet-500/10 border border-violet-500/20">
        <IntelModal onUpgrade={() => { setActiveModal(null); handleCheckout("starter"); }} />
      </WideModal>

      <WideModal open={activeModal === "team"} onClose={() => setActiveModal(null)}
        icon="🔒" title="Who is Behind This" subtitle="Built by people who have been inside · Written correspondence only"
        iconBg="bg-zinc-800 border border-zinc-700">
        <TeamModal />
      </WideModal>

      <WideModal open={activeModal === "community"} onClose={() => setActiveModal(null)}
        icon="💬" title="Community Hub" subtitle="1,240+ builders · Identities verified by NicheLab · Names withheld by request"
        iconBg="bg-red-500/10 border border-red-500/20">
        <CommunityModal onOpenAuth={(tab) => { setActiveModal(null); openAuth(tab); }} />
      </WideModal>
    </>
  );
}
