import { Skeleton } from "@/components/ui/Skeleton";

export default function InviteLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-3 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-4 h-9 w-full" />
      </div>
    </div>
  );
}
