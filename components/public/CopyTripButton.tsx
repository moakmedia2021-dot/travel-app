"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { copyTrip } from "@/app/actions/public";

type Props = {
  tripId: string;
  isAuthenticated: boolean;
};

export default function CopyTripButton({ tripId, isAuthenticated }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    setBusy(true);
    setError(null);
    const r = await copyTrip(tripId);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push(`/trips/${r.data}`);
    router.refresh();
  }

  if (!isAuthenticated) {
    const next = `/trips/${tripId}/public`;
    return (
      <Link
        href={`/signup?next=${encodeURIComponent(next)}`}
        className="inline-flex h-11 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700"
      >
        <CopyIcon />
        Sign up to copy this trip
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleCopy}
        disabled={busy}
        className="inline-flex h-11 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        <CopyIcon />
        {busy ? "Copying…" : "Copy this trip"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
