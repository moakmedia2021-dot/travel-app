"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvite } from "@/app/actions/invites";

type Props = {
  targetEmail: string | null; // we don't expose other users' emails on profile pages
  targetUsername: string | null;
  myActiveTrips: { id: string; title: string }[];
};

export default function InviteToTripButton({ targetEmail, targetUsername, myActiveTrips }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyTripId, setBusyTripId] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState(targetEmail ?? "");

  if (myActiveTrips.length === 0) {
    return (
      <button
        disabled
        title="Create a trip first"
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-400"
      >
        Invite to trip
      </button>
    );
  }

  async function handleInvite(tripId: string) {
    const email = emailInput.trim();
    if (!email) {
      setError("Enter the person's email to send an invite");
      return;
    }
    setBusyTripId(tripId);
    setError(null);
    const r = await createInvite(tripId, email, "editor");
    setBusyTripId(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setDoneMessage(`Invite sent — link: ${r.data.url}`);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Invite to trip ▾
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-neutral-200 bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs text-neutral-500">
              Invite {targetUsername ? `@${targetUsername}` : "this user"} to one of your trips. They'll get a link to accept.
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="their email address"
              className="mb-2 block w-full rounded-md border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {myActiveTrips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => handleInvite(trip.id)}
                  disabled={busyTripId !== null}
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {busyTripId === trip.id ? "Sending…" : trip.title}
                </button>
              ))}
            </div>
            {error && <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>}
            {doneMessage && (
              <p className="mt-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700 break-all">{doneMessage}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
