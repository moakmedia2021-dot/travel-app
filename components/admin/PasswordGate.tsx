"use client";

import { useState } from "react";
import { unlockAdminPortal } from "@/app/actions/admin";

export default function PasswordGate() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // On success the server action redirects, so this call doesn't return.
    // On failure it returns { error } and we handle it here.
    const result = await unlockAdminPortal(password);
    if (result && "error" in result) {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 className="mt-3 text-lg font-semibold text-neutral-900">Admin portal</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Enter the portal password to continue.
          </p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="h-11 w-full rounded-md bg-neutral-900 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {busy ? "Unlocking…" : "Unlock"}
        </button>

        <p className="text-center text-xs text-neutral-400">
          Session expires after 24 hours of inactivity.
        </p>
      </form>
    </div>
  );
}
