import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { isAdminUnlocked, lockAdminPortal } from "@/app/actions/admin";
import PasswordGate from "@/components/admin/PasswordGate";
import WaitlistManager from "@/components/admin/WaitlistManager";
import { listWaitlist } from "@/app/actions/waitlist";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user?.id)) notFound();

  if (!(await isAdminUnlocked())) {
    return <PasswordGate />;
  }

  const rows = await listWaitlist();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Link href="/admin/analytics" className="hover:text-neutral-900">
              Admin
            </Link>
            <span>›</span>
            <span className="text-neutral-700">Waitlist</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Waitlist</h1>
        </div>
        <form action={lockAdminPortal}>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            🔒 Lock
          </button>
        </form>
      </div>

      <WaitlistManager initial={rows} />
    </div>
  );
}
