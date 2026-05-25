"use client";

import { useState } from "react";
import type { TripInvite } from "@/lib/types";
import { cancelInvite } from "@/app/actions/invites";

type Props = {
  tripId: string;
  invite: TripInvite;
  canManage: boolean;
  onChange: () => void;
};

export default function PendingInviteRow({ tripId, invite, canManage, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${invite.token}`;

  async function handleCancel() {
    if (!confirm(`Cancel the invite to ${invite.email}?`)) return;
    setBusy(true);
    await cancelInvite(tripId, invite.id);
    setBusy(false);
    onChange();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-200 bg-white p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-neutral-900">{invite.email}</div>
        <div className="text-xs text-neutral-500">
          Invited as <span className="capitalize">{invite.role}</span> · Pending
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
      >
        {copied ? "Copied" : "Copy link"}
      </button>

      {canManage && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy}
          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
