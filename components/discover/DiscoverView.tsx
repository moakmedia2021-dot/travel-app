"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DiscoverTraveler } from "@/lib/types";
import TravelerCard from "./TravelerCard";
import { sendConnectionRequest } from "@/app/actions/social";
import { track } from "@/lib/analytics";
import { useEffect } from "react";

export default function DiscoverView({ travelers }: { travelers: DiscoverTraveler[] }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  if (travelers.length === 0) {
    return (
      <EmptyState />
    );
  }

  if (idx >= travelers.length) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
        <h2 className="text-base font-medium text-neutral-900">That's everyone for now</h2>
        <p className="mt-1 text-sm text-neutral-500">
          You've gone through every match. Check back after planning more trips.
        </p>
        <button
          onClick={() => {
            setIdx(0);
            setLastAction(null);
          }}
          className="mt-4 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Start over
        </button>
      </div>
    );
  }

  const current = travelers[idx];

  // Track card view whenever the current traveler changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (current) {
      track("discover_card_viewed", {
        destination: current.destination ?? null,
        score: current.score,
      });
    }
  }, [current?.user_id, current?.destination, current?.score, current]);

  async function handleConnect() {
    setBusy(true);
    const r = await sendConnectionRequest(current.user_id, null);
    setBusy(false);
    if (!r.ok) {
      setLastAction(`Couldn't connect: ${r.error}`);
    } else {
      track("discover_card_connected", {
        destination: current.destination ?? null,
        target_id: current.user_id,
      });
      setLastAction(`Sent request to ${current.full_name || current.username || "them"} ✓`);
      router.refresh();
    }
    setIdx((i) => i + 1);
  }

  function handleSkip() {
    setLastAction(null);
    setIdx((i) => i + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Discover travelers</h1>
          <p className="mt-1 text-sm text-neutral-500">
            People with trips that overlap yours
          </p>
        </div>
        <span className="text-xs text-neutral-400 tabular-nums">
          {idx + 1} of {travelers.length}
        </span>
      </div>

      {lastAction && (
        <div className="rounded-md bg-neutral-50 px-3 py-2 text-center text-sm text-neutral-600">
          {lastAction}
        </div>
      )}

      <div className="flex flex-col items-center gap-5 py-4">
        <TravelerCard traveler={current} />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSkip}
            disabled={busy}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
            title="Skip"
            aria-label="Skip"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={handleConnect}
            disabled={busy}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-sm hover:bg-green-600 disabled:opacity-50"
            title="Send connection request"
            aria-label="Connect"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
            </svg>
          </button>
        </div>

        {current.username && (
          <Link href={`/profile/${current.username}`} className="text-xs text-neutral-400 underline">
            View full profile
          </Link>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
      <h2 className="text-base font-medium text-neutral-900">No matches yet</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Discover finds travelers with trips that overlap yours. Create some trips first
        — set them to <strong>group</strong> or <strong>public</strong> visibility so others can
        find you too.
      </p>
      <Link
        href="/trips"
        className="mt-4 inline-block rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Go to trips
      </Link>
    </div>
  );
}
