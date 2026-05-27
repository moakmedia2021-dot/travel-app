"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { startCheckout, openCustomerPortal } from "@/app/actions/billing";

type Props = {
  status: "free" | "premium" | "cancelled";
  isPremium: boolean;
  periodEnd: string | null;
  stripeConfigured: boolean;
};

const FREE_FEATURES = [
  "Up to 3 active trips",
  "Up to 5 members per trip",
  "Itinerary, budget, deals, social",
  "Public sharing & copy-trip",
];

const PREMIUM_FEATURES = [
  "Unlimited trips",
  "Unlimited group members",
  "Receipt photo uploads",
  "CSV/PDF expense export",
  "Priority deal alerts",
];

export default function BillingPanel({ status, isPremium, periodEnd, stripeConfigured }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<"monthly" | "annual" | "portal" | null>(null);

  // Toast on return from Stripe checkout
  useEffect(() => {
    const s = searchParams.get("status");
    if (!s) return;
    if (s === "success") {
      toast.success("Welcome to Premium! Your account has been upgraded.");
    } else if (s === "cancelled") {
      toast.info("Checkout cancelled — no changes made.");
    }
    // Clean the URL so the toast doesn't fire on refresh
    const url = new URL(window.location.href);
    url.searchParams.delete("status");
    window.history.replaceState({}, "", url.toString());
  }, [searchParams]);

  async function go(plan: "monthly" | "annual") {
    setBusy(plan);
    const result = await startCheckout(plan);
    setBusy(null);
    if (result && !result.ok) toast.error(result.error);
  }

  async function portal() {
    setBusy("portal");
    const result = await openCustomerPortal();
    setBusy(null);
    if (result && !result.ok) toast.error(result.error);
  }

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Current plan
            </p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">
              {isPremium ? "Premium" : "Free"}
            </p>
            {status === "cancelled" && periodEnd && (
              <p className="mt-1 text-sm text-amber-700">
                Cancelled — Premium until {new Date(periodEnd).toLocaleDateString()}
              </p>
            )}
            {status === "premium" && periodEnd && (
              <p className="mt-1 text-sm text-neutral-500">
                Renews {new Date(periodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          {isPremium && (
            <button
              onClick={portal}
              disabled={busy !== null}
              className="h-11 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {busy === "portal" ? "Opening…" : "Manage subscription"}
            </button>
          )}
        </div>
      </div>

      {!stripeConfigured && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">
          <p className="font-medium text-neutral-900">Billing isn't configured yet</p>
          <p className="mt-1">
            Add <code className="rounded bg-white px-1 text-xs">STRIPE_SECRET_KEY</code>,{" "}
            <code className="rounded bg-white px-1 text-xs">STRIPE_WEBHOOK_SECRET</code>,{" "}
            <code className="rounded bg-white px-1 text-xs">STRIPE_MONTHLY_PRICE_ID</code>, and{" "}
            <code className="rounded bg-white px-1 text-xs">STRIPE_ANNUAL_PRICE_ID</code> to
            your environment to enable upgrades.
          </p>
        </div>
      )}

      {/* Plan comparison + upgrade buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PlanCard
          name="Free"
          price="$0"
          period="forever"
          features={FREE_FEATURES}
          active={!isPremium}
        />
        <PlanCard
          name="Premium"
          price="$6.99"
          period="/month"
          features={PREMIUM_FEATURES}
          highlight
          active={isPremium}
          cta={
            isPremium ? null : (
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => go("monthly")}
                  disabled={busy !== null}
                  className="h-11 rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  {busy === "monthly" ? "Loading…" : "Subscribe monthly — $6.99/mo"}
                </button>
                <button
                  onClick={() => go("annual")}
                  disabled={busy !== null}
                  className="h-11 rounded-md border border-neutral-900 bg-white px-4 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {busy === "annual" ? "Loading…" : "Save 41% — $49/year"}
                </button>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  features,
  highlight = false,
  active = false,
  cta,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
  active?: boolean;
  cta?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 ${
        highlight ? "border-neutral-900 shadow-sm" : "border-neutral-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-neutral-900">{name}</h3>
        {active && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Current
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold text-neutral-900">
        {price}
        <span className="ml-1 text-sm font-normal text-neutral-500">{period}</span>
      </p>
      <ul className="mt-4 space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}
