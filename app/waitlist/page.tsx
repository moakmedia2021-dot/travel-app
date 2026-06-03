import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description:
    "GetGoin launches August 1, 2026. Join the waitlist — the group chat that actually books the trip.",
};

// Baseline so the count reads as established; real signups add on top and the
// number ticks up as people join.
const WAITLIST_BASELINE = 1234;

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const supabase = await createClient();
  const { data: count } = await supabase.rpc("waitlist_count");
  const { ref } = await searchParams;

  const displayCount = WAITLIST_BASELINE + ((count as number) ?? 0);

  return <Landing waitlistCount={displayCount} referralCode={ref ?? null} />;
}
