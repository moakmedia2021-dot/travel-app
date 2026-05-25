// Tailwind animate-pulse skeleton primitives + ready-made variants for
// each common card in the app. All sized to match the real card heights
// to avoid layout shift when content swaps in.

import type { CSSProperties } from "react";

type Props = {
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ className = "", style }: Props) {
  return (
    <div
      className={`animate-pulse rounded-md bg-neutral-200 ${className}`}
      style={style}
    />
  );
}

// --- variants -------------------------------------------------------

export function TripCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-3 h-3 w-1/3" />
      </div>
    </div>
  );
}

export function TripCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ItineraryItemSkeleton() {
  return (
    <div className="flex gap-3 rounded-lg border border-l-4 border-neutral-200 bg-white p-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function ItineraryDaySkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="ml-7 space-y-2 border-l-2 border-neutral-100 pl-4">
        <ItineraryItemSkeleton />
        <ItineraryItemSkeleton />
      </div>
    </div>
  );
}

export function ExpenseCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
      <div className="flex flex-col items-center">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="mt-3 h-5 w-32" />
        <Skeleton className="mt-1 h-3 w-20" />
      </div>
      <div className="mt-5 space-y-2 rounded-lg bg-neutral-50 p-4">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function FeedPostSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <Skeleton className="mt-3 h-56 w-full rounded-lg" />
    </div>
  );
}

export function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function FormFieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

export function TripHeaderSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <Skeleton className="aspect-[21/9] w-full rounded-none sm:aspect-[3/1]" />
      <div className="space-y-2 p-5 sm:p-6">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-2 h-3 w-1/4" />
      </div>
    </div>
  );
}
