import { Skeleton, FeedPostSkeleton } from "@/components/ui/Skeleton";

export default function FeedLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="space-y-3">
        <FeedPostSkeleton />
        <FeedPostSkeleton />
        <FeedPostSkeleton />
      </div>
    </div>
  );
}
