import { Skeleton } from "@/components/ui/Skeleton";

export default function DealsTabLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="flex gap-1 rounded-md bg-neutral-100 p-1">
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 flex-1" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
