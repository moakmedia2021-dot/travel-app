import { Skeleton, FormFieldSkeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-18 w-18 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>
    </div>
  );
}
