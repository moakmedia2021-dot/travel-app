import { Skeleton, ExpenseCardSkeleton } from "@/components/ui/Skeleton";

export default function BudgetTabLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-32" />
        <Skeleton className="mt-4 h-2 w-full rounded-full" />
      </div>
      <div className="space-y-2">
        <ExpenseCardSkeleton />
        <ExpenseCardSkeleton />
        <ExpenseCardSkeleton />
      </div>
    </div>
  );
}
