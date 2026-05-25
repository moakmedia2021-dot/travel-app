import { Skeleton, FormFieldSkeleton } from "@/components/ui/Skeleton";

export default function DetailsTabLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <div className="grid grid-cols-2 gap-3">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
