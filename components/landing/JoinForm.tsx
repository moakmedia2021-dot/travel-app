"use client";

import { useState, useTransition } from "react";
import { joinWaitlist } from "@/app/actions/waitlist";

type Props = {
  referralCode?: string | null;
  size?: "compact" | "large";
};

export default function JoinForm({ referralCode = null, size = "large" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function action(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await joinWaitlist(formData);
      // joinWaitlist redirects on success; only returns when there's an error
      if (result && "ok" in result && !result.ok) {
        setError(result.error);
      }
    });
  }

  const inputClass =
    size === "large"
      ? "block w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-base shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
      : "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900";

  const buttonClass =
    size === "large"
      ? "h-12 w-full rounded-md bg-neutral-900 px-5 text-base font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 sm:w-auto"
      : "h-10 w-full rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 sm:w-auto";

  return (
    <form action={action} className="space-y-3">
      {referralCode && (
        <input type="hidden" name="ref" value={referralCode} />
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          name="name"
          placeholder="Your name (optional)"
          autoComplete="name"
          className={inputClass}
        />
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Joining…" : "Join the waitlist"}
        </button>
        {referralCode && (
          <p className="text-xs text-neutral-500">
            Referred via <span className="font-mono">@{referralCode}</span>
          </p>
        )}
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </form>
  );
}
