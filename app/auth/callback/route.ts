/**
 * Kroneberg & Co. — Auth Callback Handler
 * File: app/auth/callback/route.ts  (Next.js App Router)
 *
 * Called when user clicks the email verification link.
 * 1. Exchanges the code for a session.
 * 2. Records legal consent (if not already stored).
 * 3. Redirects to the appropriate Stripe payment link based on plan/cycle.
 * 4. If already paid (pro tier), redirects to dashboard.
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

const STRIPE_LINKS = {
  starter: {
    monthly: 'https://buy.stripe.com/9B63cw0A72uufWf5ywebu00',
    yearly:  'https://buy.stripe.com/aFa4gAdmT8SS5hB1igebu01',
  },
  pro: {
    monthly: 'https://buy.stripe.com/bJe00kbeLc547pJgdaebu02',
    yearly:  'https://buy.stripe.com/aFa6oI0A7glk6lFf96ebu03',
  },
} as const;

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code       = requestUrl.searchParams.get('code');
  const plan       = (requestUrl.searchParams.get('plan')  || 'starter') as 'starter' | 'pro';
  const cycle      = (requestUrl.searchParams.get('cycle') || 'monthly') as 'monthly' | 'yearly';

  if (!code) {
    return NextResponse.redirect(new URL('/auth-subscription?error=missing_code', requestUrl.origin));
  }

  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Exchange code for session — this also confirms the email
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !session) {
      console.error('[Auth Callback] Code exchange failed:', error);
      return NextResponse.redirect(
        new URL('/auth-subscription?error=verification_failed', requestUrl.origin)
      );
    }

    // Record legal consent with verified timestamp now that session exists
    const userId = session.user.id;
    await supabase.rpc('record_legal_consent', {
      p_user_id:     userId,
      p_tos_version: '2025-01-01',
    });

    // Check current profile tier (in case they're already paid)
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, role')
      .eq('id', userId)
      .single();

    // Already a paid member — send straight to dashboard
    if (profile?.tier === 'pro' || profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
    }

    // First time — redirect to Stripe payment link
    const stripeLink = STRIPE_LINKS[plan]?.[cycle] || STRIPE_LINKS.starter.monthly;

    // Pass the user's email as a prefill parameter to Stripe
    const stripeUrl = new URL(stripeLink);
    stripeUrl.searchParams.set('prefilled_email', session.user.email || '');

    return NextResponse.redirect(stripeUrl);

  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err);
    return NextResponse.redirect(
      new URL('/auth-subscription?error=unexpected', requestUrl.origin)
    );
  }
}
