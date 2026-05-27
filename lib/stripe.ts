// Stripe server client. Never import this from a client component.
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export function hasStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_MONTHLY_PRICE_ID &&
    process.env.STRIPE_ANNUAL_PRICE_ID
  );
}

export const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID || "";
export const STRIPE_ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID || "";
