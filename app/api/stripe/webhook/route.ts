import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Stripe requires the raw body for signature verification, so this route
// can't be edge / can't use req.json().
export const runtime = "nodejs";

export async function POST(req: Request) {
  const sigHeader = (await headers()).get("stripe-signature");
  if (!sigHeader) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new NextResponse("Webhook not configured", { status: 500 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sigHeader, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subId = session.subscription as string | null;
        const customerId = session.customer as string | null;
        if (!userId || !subId) break;

        const subResp = await stripe.subscriptions.retrieve(subId);
        const periodEnd = (subResp as unknown as { current_period_end: number }).current_period_end;
        await supabase
          .from("profiles")
          .update({
            subscription_status: "premium",
            subscription_id: subId,
            subscription_customer_id: customerId,
            subscription_period_end: new Date(periodEnd * 1000).toISOString(),
          })
          .eq("id", userId);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const periodEnd = (sub as Stripe.Subscription & { current_period_end: number })
          .current_period_end;
        // 'cancel_at_period_end = true' means user opted out; they keep
        // access until period_end. We flag as 'cancelled' for UI.
        const cancelling = sub.cancel_at_period_end || sub.status === "canceled";
        await supabase
          .from("profiles")
          .update({
            subscription_status: cancelling ? "cancelled" : "premium",
            subscription_id: sub.id,
            subscription_period_end: new Date(periodEnd * 1000).toISOString(),
          })
          .eq("subscription_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await supabase
          .from("profiles")
          .update({
            subscription_status: "free",
            subscription_id: null,
            subscription_period_end: null,
          })
          .eq("subscription_customer_id", customerId);
        break;
      }

      default:
        // ignore other events
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    return new NextResponse("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
