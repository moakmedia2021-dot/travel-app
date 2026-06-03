"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getTripBundle } from "@/app/actions/offline";
import {
  getTripOffline,
  saveTripOffline,
  removeTripOffline,
  offlineSupported,
} from "@/lib/offline/db";

export default function DownloadTripButton({ tripId }: { tripId: string }) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!offlineSupported()) {
      setSupported(false);
      return;
    }
    getTripOffline(tripId).then((b) => setSavedAt(b?.saved_at ?? null));
  }, [tripId]);

  async function download() {
    setBusy(true);
    try {
      const res = await getTripBundle(tripId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await saveTripOffline(res.data);
      setSavedAt(res.data.saved_at);
      toast.success("Trip saved for offline use");
    } catch {
      toast.error("Couldn't save this trip offline");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await removeTripOffline(tripId);
      setSavedAt(null);
      toast.success("Offline copy removed");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  if (savedAt) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Available offline
        </span>
        <button
          onClick={download}
          disabled={busy}
          className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
        >
          {busy ? "Updating…" : "Update"}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Remove
        </button>
        <Link href="/offline" className="text-xs font-medium text-blue-600 hover:text-blue-700">
          View offline trips →
        </Link>
      </div>
    );
  }

  return (
    <button
      onClick={download}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      title="Save this trip so you can view it without internet"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
      </svg>
      {busy ? "Saving…" : "Download for offline"}
    </button>
  );
}
