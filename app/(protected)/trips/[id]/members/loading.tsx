import { Skeleton, MemberRowSkeleton } from "@/components/ui/Skeleton";

export default function MembersTabLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-2">
        <MemberRowSkeleton />
        <MemberRowSkeleton />
        <MemberRowSkeleton />
      </div>
    </div>
  );
}
