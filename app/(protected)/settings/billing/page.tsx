import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/premium";
import { hasStripeConfigured } from "@/lib/stripe";
import BillingPanel from "@/components/billing/BillingPanel";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plan = await getPlan(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/settings" className="hover:text-neutral-900">
          Settings
        </Link>
        <span>›</span>
        <span className="text-neutral-700">Billing</span>
      </div>
      <h1 className="text-2xl font-semibold text-neutral-900">Plan & billing</h1>
      <BillingPanel
        status={plan.status}
        isPremium={plan.isPremium}
        periodEnd={plan.periodEnd}
        stripeConfigured={hasStripeConfigured()}
      />
    </div>
  );
}
