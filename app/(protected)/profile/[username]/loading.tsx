import { Skeleton, FeedPostSkeleton, TripCardGridSkeleton } from "@/components/ui/Skeleton";

export default function PublicProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="mt-5 flex gap-6 border-t border-neutral-100 pt-4">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-16" />
        </div>
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <section className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <TripCardGridSkeleton count={3} />
      </section>
      <section className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <FeedPostSkeleton />
        <FeedPostSkeleton />
      </section>
    </div>
  );
}
