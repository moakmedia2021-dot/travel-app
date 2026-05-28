"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Expense, ExpenseCategory, TripMember } from "@/lib/types";
import { formatMoney } from "@/lib/currencies";
import BudgetSummary from "./BudgetSummary";
import SettleUp from "./SettleUp";
import ExpenseCard from "./ExpenseCard";
import ExpenseSlideOver from "./ExpenseSlideOver";
import { CATEGORY_CONFIG, CATEGORY_ORDER, categoryConfig } from "./categoryConfig";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseInput,
} from "@/app/actions/expenses";
import { track } from "@/lib/analytics";

type Props = {
  tripId: string;
  tripCurrency: string;
  tripBudget: number | null;
  members: TripMember[];
  currentUserId: string;
  initialExpenses: Expense[];
};

export default function BudgetView({
  tripId,
  tripCurrency,
  tripBudget,
  members,
  currentUserId,
  initialExpenses,
}: Props) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [slideOver, setSlideOver] = useState<{
    mode: "add" | "edit";
    expense: Expense | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const grouped = useMemo(() => {
    const map = new Map<string, { items: Expense[]; total: number }>();
    for (const cat of CATEGORY_ORDER) map.set(cat, { items: [], total: 0 });
    for (const e of expenses) {
      const cat = (e.category as ExpenseCategory) || "misc";
      const bucket = map.get(cat) ?? { items: [], total: 0 };
      bucket.items.push(e);
      bucket.total += Number(e.amount);
      map.set(cat, bucket);
    }
    return Array.from(map.entries()).filter(([, v]) => v.items.length > 0);
  }, [expenses]);

  async function handleSave(input: ExpenseInput) {
    setError(null);
    if (!slideOver) return;

    if (slideOver.mode === "add") {
      const result = await createExpense(tripId, input);
      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }
      track("expense_added", {
        category: input.category,
        is_group_trip: members.length > 1,
        amount: input.amount,
        currency: input.currency,
      });
      router.refresh();
    } else if (slideOver.expense) {
      const result = await updateExpense(tripId, slideOver.expense.id, input);
      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }
      router.refresh();
    }
    setSlideOver(null);
  }

  async function handleDelete() {
    if (!slideOver?.expense) return;
    const id = slideOver.expense.id;
    const snapshot = expenses;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setSlideOver(null);

    const result = await deleteExpense(tripId, id);
    if (!result.ok) {
      setExpenses(snapshot);
      setError(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Spending
        </h2>
        <button
          type="button"
          onClick={() => setSlideOver({ mode: "add", expense: null })}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add expense
        </button>
      </div>

      <BudgetSummary budget={tripBudget} currency={tripCurrency} spent={totalSpent} />

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <SettleUp
        members={members}
        expenses={expenses}
        currency={tripCurrency}
      />

      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <h3 className="text-base font-medium text-neutral-900">No expenses yet</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Log your first one to start tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, { items, total }]) => {
            const cfg = categoryConfig(cat);
            return (
              <section key={cat}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold capitalize text-neutral-900">
                    {CATEGORY_CONFIG[cat as ExpenseCategory].label}
                  </h3>
                  <span className="text-sm tabular-nums text-neutral-500">
                    {formatMoney(total, tripCurrency)}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      members={members}
                      onClick={() => setSlideOver({ mode: "edit", expense })}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ExpenseSlideOver
        open={slideOver !== null}
        mode={slideOver?.mode ?? "add"}
        expense={slideOver?.expense ?? null}
        members={members}
        currentUserId={currentUserId}
        tripCurrency={tripCurrency}
        onClose={() => setSlideOver(null)}
        onSave={handleSave}
        onDelete={slideOver?.mode === "edit" ? handleDelete : undefined}
      />
    </div>
  );
}
