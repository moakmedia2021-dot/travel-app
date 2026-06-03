import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description:
    "GetGoin launches August 1, 2026. Join the waitlist — the group chat that actually books the trip.",
};

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const supabase = await createClient();
  const { data: count } = await supabase.rpc("waitlist_count");
  const { ref } = await searchParams;

  return <Landing waitlistCount={(count as number) ?? 0} referralCode={ref ?? null} />;
}
