"use client";

import type { Expense, TripMember } from "@/lib/types";
import { formatMoney } from "@/lib/currencies";
import { categoryConfig } from "./categoryConfig";
import { MemberAvatar, memberDisplayName, findMember } from "./MemberAvatar";

type Props = {
  expense: Expense;
  members: TripMember[];
  onClick: () => void;
};

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ExpenseCard({ expense, members, onClick }: Props) {
  const cfg = categoryConfig(expense.category);
  const payer = findMember(members, expense.paid_by);

  const splitCount = expense.expense_splits.length;
  const splitLabel =
    splitCount === 0
      ? "No split"
      : expense.split_type === "equal"
        ? `Split equally · ${splitCount}`
        : `Custom split · ${splitCount}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.iconBg} ${cfg.iconColor}`}
      >
        {cfg.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="truncate text-sm font-semibold text-neutral-900">
            {expense.title}
          </h4>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">
            {formatMoney(Number(expense.amount), expense.currency)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
          <MemberAvatar profile={payer?.profile} size={16} />
          <span className="truncate">
            {memberDisplayName(payer?.profile)} · {formatDate(expense.date)} · {splitLabel}
          </span>
        </div>
      </div>
    </button>
  );
}
