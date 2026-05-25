import { Skeleton } from "@/components/ui/Skeleton";

export default function OnboardingLoading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      <div className="flex justify-center gap-2 py-6">
        <Skeleton className="h-2 w-8 rounded-full" />
        <Skeleton className="h-2 w-2 rounded-full" />
        <Skeleton className="h-2 w-2 rounded-full" />
        <Skeleton className="h-2 w-2 rounded-full" />
      </div>
      <div className="mx-auto w-full max-w-md space-y-6 px-1 py-4">
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-7 w-64" />
          <Skeleton className="mx-auto h-4 w-48" />
        </div>
        <Skeleton className="mx-auto h-24 w-24 rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
