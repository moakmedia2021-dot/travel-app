"use client";

import { useEffect } from "react";
import ErrorCard from "@/components/ui/ErrorCard";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <ErrorCard
          title="Something broke"
          description="We've logged the error. Try refreshing — most things are recoverable."
          onRetry={reset}
        />
      </div>
    </div>
  );
}
