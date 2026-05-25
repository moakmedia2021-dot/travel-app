import { formatMoney } from "@/lib/currencies";

type Props = {
  budget: number | null;
  currency: string;
  spent: number;
};

export default function BudgetSummary({ budget, currency, spent }: Props) {
  const hasBudget = budget != null && budget > 0;
  const remaining = hasBudget ? Math.max(0, budget! - spent) : 0;
  const pct = hasBudget ? Math.min(100, (spent / budget!) * 100) : 0;
  const overBudget = hasBudget && spent > budget!;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Total spent
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-neutral-900">
            {formatMoney(spent, currency)}
          </p>
        </div>
        {hasBudget && (
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {overBudget ? "Over budget" : "Remaining"}
            </p>
            <p
              className={`mt-1 text-lg font-semibold tabular-nums ${
                overBudget ? "text-red-600" : "text-neutral-700"
              }`}
            >
              {overBudget
                ? `-${formatMoney(spent - budget!, currency)}`
                : formatMoney(remaining, currency)}
            </p>
            <p className="text-xs text-neutral-400">
              of {formatMoney(budget!, currency)}
            </p>
          </div>
        )}
      </div>

      {hasBudget && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className={`h-full rounded-full transition-all ${
                overBudget
                  ? "bg-red-500"
                  : pct > 80
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
