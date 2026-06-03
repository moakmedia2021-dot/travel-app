import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReferralStats } from "@/app/actions/referral";
import ReferralPanel from "@/components/settings/ReferralPanel";

export const metadata: Metadata = { title: "Referrals" };
export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stats = await getReferralStats();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Settings
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-neutral-900">Referrals</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Invite friends to GetGoin and unlock more free trips.
        </p>
      </div>

      <ReferralPanel stats={stats} />
    </div>
  );
}
