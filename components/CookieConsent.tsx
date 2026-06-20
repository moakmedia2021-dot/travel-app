"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "@/lib/consent";

export default function CookieConsent() {
  // Render nothing until mounted (avoids hydration mismatch); show only if the
  // visitor hasn't chosen yet.
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setShow(true);
  }, []);

  if (!show) return null;

  function choose(v: "granted" | "denied") {
    setConsent(v);
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:px-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">
          We use cookies for analytics to improve GetGoin. You can accept or use only essential
          cookies.{" "}
          <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-700">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("denied")}
            className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 sm:flex-none"
          >
            Essential only
          </button>
          <button
            onClick={() => choose("granted")}
            className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 sm:flex-none"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
