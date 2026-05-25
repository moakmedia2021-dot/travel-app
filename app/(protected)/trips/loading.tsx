import { Skeleton, TripCardGridSkeleton } from "@/components/ui/Skeleton";

export default function TripsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <TripCardGridSkeleton count={6} />
    </div>
  );
}
