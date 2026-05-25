"use client";

import { formatMoney } from "@/lib/currencies";

type Props = {
  spent: number;
  budget: number | null;
  currency: string;
  pendingPreview: number | null; // shown on hover
};

export default function BudgetBar({ spent, budget, currency, pendingPreview }: Props) {
  const previewTotal = spent + (pendingPreview ?? 0);
  const hasBudget = budget != null && budget > 0;
  const pct = hasBudget ? Math.min(100, (previewTotal / budget!) * 100) : 0;
  const over = hasBudget && previewTotal > budget!;

  return (
    <div className="sticky bottom-0 -mx-4 mt-6 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {pendingPreview != null ? "If you add this" : "Trip spending"}
          </div>
          <div className="mt-0.5 text-sm tabular-nums text-neutral-900">
            <span className={`font-semibold ${over ? "text-red-600" : ""}`}>
              {formatMoney(previewTotal, currency)}
            </span>
            {hasBudget && (
              <span className="text-neutral-400"> / {formatMoney(budget!, currency)}</span>
            )}
            {pendingPreview != null && pendingPreview > 0 && (
              <span className="ml-2 text-xs text-neutral-500">
                (+{formatMoney(pendingPreview, currency)})
              </span>
            )}
          </div>
        </div>
        {hasBudget && (
          <div className="hidden h-2 w-48 overflow-hidden rounded-full bg-neutral-100 sm:block">
            <div
              className={`h-full rounded-full transition-all ${
                over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
