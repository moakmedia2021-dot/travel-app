import { Skeleton, MemberRowSkeleton } from "@/components/ui/Skeleton";

export default function ConnectionsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-40" />
      <section className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <MemberRowSkeleton />
        <MemberRowSkeleton />
        <MemberRowSkeleton />
      </section>
    </div>
  );
}
