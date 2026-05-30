import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { isAdminUnlocked, lockAdminPortal } from "@/app/actions/admin";
import PasswordGate from "@/components/admin/PasswordGate";
import AdminNav from "@/components/admin/AdminNav";
import UsersManager from "@/components/admin/UsersManager";
import { listUsers } from "@/app/actions/adminUsers";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user?.id)) notFound();

  if (!(await isAdminUnlocked())) {
    return <PasswordGate />;
  }

  const result = await listUsers();

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
        <h2 className="text-lg font-semibold text-neutral-900">Users</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Verify accounts, grant or revoke premium, and manage access.
        </p>
      </div>

      {result.ok ? (
        <UsersManager initial={result.users} />
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-900">Can&apos;t load users</h3>
          <p className="mt-1 text-sm text-amber-800">{result.error}</p>
          <p className="mt-3 text-xs text-amber-700">
            Reading signed-up accounts requires the Supabase{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">service_role</code> key. Add{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{" "}
            to your environment (Supabase Dashboard → Project Settings → API → service_role), then
            restart / redeploy.
          </p>
        </div>
      )}
    </div>
  );
}
