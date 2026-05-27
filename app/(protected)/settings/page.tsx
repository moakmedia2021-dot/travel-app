import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/premium";
import NotificationPrefsForm from "@/components/settings/NotificationPrefs";
import DangerZone from "@/components/settings/DangerZone";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from "@/lib/notificationPrefs";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, plan] = await Promise.all([
    supabase
      .from("profiles")
      .select("notification_prefs")
      .eq("id", user.id)
      .single(),
    getPlan(user.id),
  ]);

  const prefs: NotificationPrefs = {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...((profile?.notification_prefs as Partial<NotificationPrefs> | null) ?? {}),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>

      {/* Profile shortcut */}
      <Link
        href="/profile"
        className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300"
      >
        <div>
          <div className="text-base font-semibold text-neutral-900">Profile</div>
          <div className="text-sm text-neutral-500">
            Name, username, bio, avatar, travel tags, home airport
          </div>
        </div>
        <svg className="h-5 w-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      {/* Billing shortcut */}
      <Link
        href="/settings/billing"
        className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-neutral-900">Plan & billing</span>
            {plan.isPremium && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Premium
              </span>
            )}
          </div>
          <div className="text-sm text-neutral-500">
            {plan.isPremium
              ? plan.periodEnd
                ? `Renews ${new Date(plan.periodEnd).toLocaleDateString()}`
                : "Active subscription"
              : "Free plan — upgrade for unlimited trips & members"}
          </div>
        </div>
        <svg className="h-5 w-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      <NotificationPrefsForm initial={prefs} />
      <DangerZone />
    </div>
  );
}
