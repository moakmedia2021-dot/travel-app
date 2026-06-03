import { redirect } from "next/navigation";
import { isWaitlistMode } from "@/lib/waitlistMode";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  // Not in waitlist mode → straight into the app.
  if (!isWaitlistMode()) {
    redirect("/dashboard");
  }

  // Waitlist mode → the dedicated /waitlist page (preserve referral code).
  const { ref } = await searchParams;
  redirect(ref ? `/waitlist?ref=${encodeURIComponent(ref)}` : "/waitlist");
}
