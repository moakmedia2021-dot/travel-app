"use client";

import { useEffect } from "react";
import ErrorCard from "@/components/ui/ErrorCard";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[protected error]", error);
  }, [error]);

  return (
    <div className="py-8">
      <ErrorCard
        title="Couldn't load this page"
        description="An error occurred while fetching data. Try again, or head back to your trips."
        onRetry={reset}
      />
    </div>
  );
}
