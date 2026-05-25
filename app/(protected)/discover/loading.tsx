import { Skeleton, ProfileCardSkeleton } from "@/components/ui/Skeleton";

export default function DiscoverLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col items-center gap-5 py-4">
        <ProfileCardSkeleton />
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}
