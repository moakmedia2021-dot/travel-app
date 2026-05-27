"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { deleteMyAccount } from "@/app/actions/account";

export default function DangerZone() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const confirm1 = window.prompt(
      'This permanently anonymizes your profile and signs you out. Trips you owned remain visible to other members. Type "delete my account" to confirm.'
    );
    if (confirm1 !== "delete my account") return;

    setBusy(true);
    const result = await deleteMyAccount();
    if (!result.ok) {
      setBusy(false);
      toast.error(result.error);
      return;
    }

    // Sign out on the client side
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white p-5">
      <h2 className="text-base font-semibold text-red-700">Danger zone</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Deleting your account anonymizes your profile, signs you out, and removes you from
        all trips you're a member of. Trips you owned remain for other members. This
        cannot be undone.
      </p>
      <button
        onClick={handleDelete}
        disabled={busy}
        className="mt-3 h-11 rounded-md border border-red-300 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete my account"}
      </button>
    </div>
  );
}
