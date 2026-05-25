"use client";

import { useEffect } from "react";
import ErrorCard from "@/components/ui/ErrorCard";

export default function TripError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[trip error]", error);
  }, [error]);

  return (
    <div className="py-4">
      <ErrorCard
        title="Couldn't load this trip"
        description="There was a problem loading the trip data. Try again."
        onRetry={reset}
      />
    </div>
  );
}
