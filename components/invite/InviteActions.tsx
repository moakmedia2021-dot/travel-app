"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite, declineInvite } from "@/app/actions/invites";

export default function InviteActions({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  async function handleAccept() {
    setBusy("accept");
    setError(null);
    const result = await acceptInvite(token);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    router.push(`/trips/${result.data}`);
    router.refresh();
  }

  async function handleDecline() {
    setBusy("decline");
    setError(null);
    const result = await declineInvite(token);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setDeclined(true);
    setBusy(null);
  }

  if (declined) {
    return (
      <div className="rounded-md bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
        Invitation declined.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={busy !== null}
          className="flex-1 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {busy === "accept" ? "Joining…" : "Accept invitation"}
        </button>
        <button
          onClick={handleDecline}
          disabled={busy !== null}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
        >
          {busy === "decline" ? "…" : "Decline"}
        </button>
      </div>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
