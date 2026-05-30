import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { isAdminUnlocked, lockAdminPortal } from "@/app/actions/admin";
import PasswordGate from "@/components/admin/PasswordGate";
import AdminNav from "@/components/admin/AdminNav";
import BusinessHub from "@/components/admin/business/BusinessHub";
import { listCollaborations, listDocuments } from "@/app/actions/business";

export const dynamic = "force-dynamic";

export default async function AdminBusinessPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user?.id)) notFound();
  if (!(await isAdminUnlocked())) return <PasswordGate />;

  const [collaborations, documents] = await Promise.all([listCollaborations(), listDocuments()]);

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
        <h2 className="text-lg font-semibold text-neutral-900">Business</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          CRM for your Airbnb collaborations, content studio, and documents.
        </p>
      </div>

      <BusinessHub initialCollaborations={collaborations} initialDocuments={documents} />
    </div>
  );
}
