-- ============================================================
-- NicheLab Database Migration v2.0
-- Run in Supabase SQL Editor — execute in full, top to bottom
-- ============================================================

-- ── Step 1: Private schema ────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;

-- ── Step 2: Tables (dependency order) ────────────────────

-- 2a. profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email            TEXT        NOT NULL,
  full_name        TEXT,
  role             TEXT        NOT NULL DEFAULT 'user'    CHECK (role    IN ('user', 'admin')),
  tier             TEXT        NOT NULL DEFAULT 'starter' CHECK (tier    IN ('starter', 'pro')),
  reports_used_this_week INTEGER NOT NULL DEFAULT 0,
  week_reset_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avatar_url       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. reports
CREATE TABLE IF NOT EXISTS public.reports (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT        NOT NULL,
  category        TEXT        NOT NULL,
  niche           TEXT        NOT NULL,
  content         TEXT        NOT NULL,
  summary         TEXT,
  signal          INTEGER     DEFAULT 50 CHECK (signal >= 0 AND signal <= 100),
  status          TEXT        NOT NULL DEFAULT 'draft'    CHECK (status   IN ('draft', 'published', 'archived')),
  tier_required   TEXT        NOT NULL DEFAULT 'starter'  CHECK (tier_required IN ('starter', 'pro')),
  word_count      INTEGER     DEFAULT 0,
  analyst_code    TEXT,
  published_at    TIMESTAMPTZ,
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2c. report_reads (access tracking)
CREATE TABLE IF NOT EXISTS public.report_reads (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id   UUID        NOT NULL REFERENCES public.reports(id)  ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

-- ── Step 3: Replica identity for Realtime ────────────────
ALTER TABLE public.reports  REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- ── Step 4: Functions ─────────────────────────────────────

-- 4a. Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- 4b. Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_reports_updated_at  ON public.reports;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

CREATE TRIGGER set_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- 4c. Increment weekly report usage (auto-resets stale week)
CREATE OR REPLACE FUNCTION public.increment_report_usage(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset counter if more than 7 days have passed
  UPDATE public.profiles
  SET    reports_used_this_week = 0,
         week_reset_at          = NOW()
  WHERE  id            = p_user_id
    AND  week_reset_at < NOW() - INTERVAL '7 days';

  -- Increment
  UPDATE public.profiles
  SET    reports_used_this_week = reports_used_this_week + 1
  WHERE  id = p_user_id;
END;
$$;

-- 4d. Check if user can read a report (tier + usage gate)
CREATE OR REPLACE FUNCTION public.can_read_report(p_user_id UUID, p_report_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier          TEXT;
  v_tier_required TEXT;
  v_used          INTEGER;
  v_reset_at      TIMESTAMPTZ;
BEGIN
  SELECT tier, reports_used_this_week, week_reset_at
  INTO   v_tier, v_used, v_reset_at
  FROM   public.profiles WHERE id = p_user_id;

  SELECT tier_required INTO v_tier_required
  FROM   public.reports  WHERE id = p_report_id;

  -- Tier gate
  IF v_tier_required = 'pro' AND v_tier != 'pro' THEN
    RETURN FALSE;
  END IF;

  -- Weekly quota gate (starter = 10/week, pro = unlimited)
  IF v_tier = 'starter' THEN
    -- Auto-reset if stale
    IF v_reset_at < NOW() - INTERVAL '7 days' THEN
      v_used := 0;
    END IF;
    IF v_used >= 10 THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

-- ── Step 5: Row Level Security ────────────────────────────

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reads ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- reports policies
CREATE POLICY "Authenticated users view published reports"
  ON public.reports FOR SELECT
  USING (status = 'published' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access reports"
  ON public.reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- report_reads policies
CREATE POLICY "Users manage own reads"
  ON public.report_reads FOR ALL
  USING (auth.uid() = user_id);

-- ── Step 6: Realtime publication ─────────────────────────
-- Note: "publication already exists" error below is non-fatal
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ── Step 7: Post-migration admin setup ───────────────────
-- After running this script:
--
-- 1. Create your admin user:
--    Supabase Dashboard → Authentication → Users → "Create new user"
--    Check "Auto Confirm User". Email: your-email@example.com
--
-- 2. Grant admin privileges:
--    UPDATE public.profiles
--    SET role = 'admin', tier = 'pro'
--    WHERE email = 'your-email@example.com';
--
-- 3. Verify: SELECT id, email, role, tier FROM public.profiles;
-- ============================================================
