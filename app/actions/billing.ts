"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getStripe,
  hasStripeConfigured,
  STRIPE_MONTHLY_PRICE_ID,
  STRIPE_ANNUAL_PRICE_ID,
} from "@/lib/stripe";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://getgoin.app").replace(/\/$/, "");
}

export async function startCheckout(plan: "monthly" | "annual"): Promise<{ ok: false; error: string } | never> {
  if (!hasStripeConfigured()) {
    return { ok: false, error: "Billing isn't configured yet. Set STRIPE_SECRET_KEY and price IDs." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_customer_id")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  const priceId = plan === "annual" ? STRIPE_ANNUAL_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;
  if (!priceId) return { ok: false, error: `Missing price ID for ${plan} plan` };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: profile?.subscription_customer_id ?? undefined,
    customer_email: profile?.subscription_customer_id ? undefined : user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    success_url: `${siteUrl()}/settings/billing?status=success`,
    cancel_url: `${siteUrl()}/settings/billing?status=cancelled`,
    allow_promotion_codes: true,
  });

  if (!session.url) return { ok: false, error: "Stripe didn't return a session URL" };
  redirect(session.url);
}

export async function openCustomerPortal(): Promise<{ ok: false; error: string } | never> {
  if (!hasStripeConfigured()) {
    return { ok: false, error: "Billing isn't configured yet." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile?.subscription_customer_id) {
    return { ok: false, error: "No customer record yet — start a subscription first." };
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.subscription_customer_id,
    return_url: `${siteUrl()}/settings/billing`,
  });
  if (!portal.url) return { ok: false, error: "Stripe didn't return a portal URL" };
  redirect(portal.url);
}
