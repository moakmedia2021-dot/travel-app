import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { isAdminUnlocked, lockAdminPortal } from "@/app/actions/admin";
import PasswordGate from "@/components/admin/PasswordGate";
import AdminNav from "@/components/admin/AdminNav";
import WaitlistManager from "@/components/admin/WaitlistManager";
import { listWaitlist } from "@/app/actions/waitlist";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user?.id)) notFound();

  if (!(await isAdminUnlocked())) {
    return <PasswordGate />;
  }

  const rows = await listWaitlist();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">Internal admin tools.</p>
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

      <AdminNav />

      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Waitlist</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Grant beta access manually or in bulk by current position.
        </p>
      </div>

      <WaitlistManager initial={rows} />
    </div>
  );
}
