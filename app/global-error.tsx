"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// global-error.tsx is the only place that can catch errors in the root layout.
// It replaces the entire app HTML, so we render <html><body> ourselves.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="mt-4 text-lg font-semibold text-neutral-900">
              Something went wrong
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              We hit an unexpected error and our team has been notified. Try reloading the page.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => reset()}
                className="h-11 rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700"
              >
                Reload
              </button>
              <a
                href="/dashboard"
                className="flex h-11 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
