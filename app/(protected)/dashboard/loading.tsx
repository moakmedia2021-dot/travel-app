import { Skeleton, TripCardGridSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <section>
        <Skeleton className="mb-3 h-3 w-24" />
        <TripCardGridSkeleton count={3} />
      </section>
    </div>
  );
}
