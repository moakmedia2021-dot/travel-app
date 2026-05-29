import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Landing from "@/components/landing/Landing";
import { isWaitlistMode } from "@/lib/waitlistMode";

// ISR — refresh the social-proof count every hour
export const revalidate = 3600;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  if (!isWaitlistMode()) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: count } = await supabase.rpc("waitlist_count");
  const { ref } = await searchParams;

  return <Landing waitlistCount={(count as number) ?? 0} referralCode={ref ?? null} />;
}
