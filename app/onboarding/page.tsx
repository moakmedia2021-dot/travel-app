import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Already onboarded — skip the wizard.
  if (profile?.onboarding_complete) {
    redirect("/dashboard");
  }

  // Pre-fill display name from full_name (if set) or auth metadata / email local part.
  const fromMeta =
    (user.user_metadata?.full_name as string | undefined) ?? null;
  const fromEmail = user.email ? user.email.split("@")[0] : "";
  const initialFullName = profile?.full_name || fromMeta || fromEmail;

  return (
    <OnboardingWizard
      userId={user.id}
      email={user.email ?? ""}
      initialFullName={initialFullName}
    />
  );
}
