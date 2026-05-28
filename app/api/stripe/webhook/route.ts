import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { reportStripeError } from "@/lib/errorContext";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Stripe moved current_period_end off the Subscription root and onto
// subscription items in newer API versions. Pull from wherever it is.
function readPeriodEnd(sub: unknown): number | null {
  const s = sub as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  return s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null;
}

export async function POST(req: Request) {
  const sigHeader = (await headers()).get("stripe-signature");
  if (!sigHeader) {
    console.error("[stripe webhook] missing stripe-signature header");
    return new NextResponse("Missing signature", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET not set");
    return new NextResponse("Webhook not configured", { status: 500 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sigHeader, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    reportStripeError(err, { event_type: "signature_verification" });
    return new NextResponse("Invalid signature", { status: 400 });
  }

  logger.info("stripe webhook", `received ${event.type}`);

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    console.error("[stripe webhook] cannot create service client", err);
    return new NextResponse("Service config error", { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ?? session.client_reference_id;
        const subId = session.subscription as string | null;
        const customerId = session.customer as string | null;

        logger.info("stripe webhook", "checkout.session.completed", {
          userId,
          subId,
          customerId,
        });

        if (!userId || !subId) {
          console.error("[stripe webhook] missing userId or subId on checkout session");
          break;
        }

        const subResp = await stripe.subscriptions.retrieve(subId);
        const periodEndSec = readPeriodEnd(subResp);
        const periodEndISO = periodEndSec
          ? new Date(periodEndSec * 1000).toISOString()
          : null;

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "premium",
            subscription_id: subId,
            subscription_customer_id: customerId,
            subscription_period_end: periodEndISO,
          })
          .eq("id", userId);
        if (error) {
          logger.error("stripe webhook", "update profile failed", error);
        } else {
          logger.info("stripe webhook", "profile updated to premium", { userId });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const periodEndSec = readPeriodEnd(sub);
        const cancelling = sub.cancel_at_period_end || sub.status === "canceled";

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: cancelling ? "cancelled" : "premium",
            subscription_id: sub.id,
            subscription_period_end: periodEndSec
              ? new Date(periodEndSec * 1000).toISOString()
              : null,
          })
          .eq("subscription_customer_id", customerId);
        if (error) console.error("[stripe webhook] sub.updated update failed", error);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "free",
            subscription_id: null,
            subscription_period_end: null,
          })
          .eq("subscription_customer_id", customerId);
        if (error) console.error("[stripe webhook] sub.deleted update failed", error);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    reportStripeError(err, { event_type: event.type });
    return new NextResponse("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
