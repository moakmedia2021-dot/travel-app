"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ReferralStats } from "@/app/actions/referral";

const MAX_BONUS = 10;

export default function ReferralPanel({ stats }: { stats: ReferralStats | null }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!stats) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Your referral code isn&apos;t ready yet. Run migration 0031, then reload.
      </div>
    );
  }

  const link = `${origin}/r/${stats.referral_code}`;
  const message = `Plan your next trip with me on GetGoin — join with my link: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "GetGoin", text: message, url: link });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  }

  const atCap = stats.bonus_trips >= MAX_BONUS;
  const pct = Math.min(100, (stats.bonus_trips / MAX_BONUS) * 100);

  return (
    <div className="space-y-5">
      {/* Reward summary */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Free trips unlocked
            </div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-neutral-900">
              {stats.free_trip_limit}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Referrals
            </div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-blue-600">
              {stats.referrals}
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          {atCap
            ? "You've unlocked the maximum referral bonus. Nice work! 🎉"
            : `Each friend who joins unlocks +1 free trip (up to +${MAX_BONUS}). You're at +${stats.bonus_trips}.`}
        </p>
      </div>

      {/* Share link */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Your referral link</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Share it — when someone joins GetGoin through your link, you unlock another free trip.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={link || "…"}
            onFocusCapture={(e) => e.currentTarget.select()}
            className="h-11 flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 font-mono text-sm text-neutral-700"
          />
          <button
            onClick={copy}
            className="h-11 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button
            onClick={share}
            className="h-11 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Share
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            WhatsApp
          </a>
          <a
            href={`sms:?&body=${encodeURIComponent(message)}`}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Messages
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent("Join me on GetGoin")}&body=${encodeURIComponent(message)}`}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Email
          </a>
        </div>
      </div>
    </div>
  );
}
