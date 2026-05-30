"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import TransactionSlideOver from "./TransactionSlideOver";
import { AccountsModal, BudgetModal, CategoriesModal } from "./ManageModals";
import {
  saveTransaction,
  deleteTransaction,
  saveAccount,
  deleteAccount,
  saveCategory,
  deleteCategory,
  setBudget,
} from "@/app/actions/finance";
import {
  addMonths,
  formatAmount,
  formatSigned,
  formatDateLabel,
  groupByDate,
  monthKey,
  monthLabel,
  parseMonth,
} from "@/lib/finance/format";
import type {
  AccountInput,
  CategoryInput,
  CategoryBreakdownRow,
  EnrichedTransaction,
  FinanceAccount,
  FinanceCategory,
  FinanceScope,
  MonthlyTotal,
  ScopeFilter,
  TransactionInput,
} from "@/lib/finance/types";

// Recharts is heavy (~100kB). Load it only when the finance tab actually
// renders, keeping the initial admin navigation snappy.
const FinanceTrendChart = dynamic(() => import("./FinanceCharts"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-md bg-neutral-100" />,
});

type Props = {
  monthKey: string;
  scope: ScopeFilter;
  baseCurrency: string;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  transactions: EnrichedTransaction[];
  summary: { income: number; expense: number; net: number };
  categoryBreakdown: CategoryBreakdownRow[];
  budgetRows: { category_id: string; name: string; color: string; budget: number; spent: number }[];
  accountBalances: { account: FinanceAccount; balance: number }[];
  netWorth: number;
  monthlyTotals: MonthlyTotal[];
};

type Modal = "none" | "budgets" | "accounts" | "categories";

export default function FinanceHub({
  monthKey: monthKeyProp,
  scope,
  baseCurrency,
  accounts,
  categories,
  transactions,
  summary,
  categoryBreakdown,
  budgetRows,
  accountBalances,
  netWorth,
  monthlyTotals,
}: Props) {
  const router = useRouter();
  const monthDate = parseMonth(monthKeyProp);

  const [search, setSearch] = useState("");
  const [txOpen, setTxOpen] = useState(false);
  const [txMode, setTxMode] = useState<"add" | "edit">("add");
  const [editingTx, setEditingTx] = useState<EnrichedTransaction | null>(null);
  const [modal, setModal] = useState<Modal>("none");

  const balanceMap = useMemo(
    () => new Map(accountBalances.map((a) => [a.account.id, a.balance])),
    [accountBalances]
  );

  function navigate(nextMonth: string, nextScope: ScopeFilter) {
    const params = new URLSearchParams();
    params.set("month", nextMonth);
    if (nextScope !== "all") params.set("scope", nextScope);
    router.push(`/admin/finance?${params.toString()}`);
  }

  function changeMonth(delta: number) {
    navigate(monthKey(addMonths(monthDate, delta)), scope);
  }

  function defaultScopeForForm(): FinanceScope {
    return scope === "business" ? "business" : "personal";
  }

  function openAdd() {
    setTxMode("add");
    setEditingTx(null);
    setTxOpen(true);
  }

  function openEdit(t: EnrichedTransaction) {
    setTxMode("edit");
    setEditingTx(t);
    setTxOpen(true);
  }

  async function handleSaveTx(input: TransactionInput) {
    const res = await saveTransaction(input);
    if (!res.ok) throw new Error(res.error);
    toast.success(input.id ? "Transaction updated" : "Transaction added");
    setTxOpen(false);
    router.refresh();
  }

  async function handleDeleteTx() {
    if (!editingTx) return;
    const res = await deleteTransaction(editingTx.id);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success("Transaction deleted");
    setTxOpen(false);
    router.refresh();
  }

  async function handleSetBudget(categoryId: string, amount: number) {
    const res = await setBudget({
      month: `${monthKeyProp}-01`,
      scope: defaultScopeForForm(),
      categoryId,
      amount,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Budget saved");
    router.refresh();
  }

  async function handleSaveAccount(input: AccountInput) {
    const res = await saveAccount(input);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success("Account saved");
    router.refresh();
  }

  async function handleDeleteAccount(id: string) {
    const res = await deleteAccount(id);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success("Account deleted");
    router.refresh();
  }

  async function handleSaveCategory(input: CategoryInput) {
    const res = await saveCategory(input);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success("Category saved");
    router.refresh();
  }

  async function handleDeleteCategory(id: string) {
    const res = await deleteCategory(id);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success("Category deleted");
    router.refresh();
  }

  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) =>
      [t.merchant, t.note, t.category_name, t.account_name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [transactions, search]);

  const grouped = useMemo(() => groupByDate(filteredTx), [filteredTx]);
  const topSpend = categoryBreakdown[0]?.spent ?? 0;

  const scopes: { value: ScopeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "personal", label: "Personal" },
    { value: "business", label: "Business" },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            aria-label="Previous month"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-neutral-900">
            {monthLabel(monthDate)}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            aria-label="Next month"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => navigate(monthKey(new Date()), scope)}
            className="ml-1 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            This month
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-neutral-300 p-0.5">
            {scopes.map((s) => (
              <button
                key={s.value}
                onClick={() => navigate(monthKeyProp, s.value)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  scope === s.value
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={openAdd}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Net worth" value={formatAmount(netWorth, baseCurrency)} tone="neutral" />
        <SummaryCard label="Income" value={formatAmount(summary.income, baseCurrency)} tone="green" />
        <SummaryCard label="Expenses" value={formatAmount(summary.expense, baseCurrency)} tone="red" />
        <SummaryCard
          label="Net"
          value={formatAmount(summary.net, baseCurrency)}
          tone={summary.net >= 0 ? "green" : "red"}
        />
      </div>

      {/* Chart + breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Last 6 months">
          <FinanceTrendChart data={monthlyTotals} currency={baseCurrency} />
        </Card>
        <Card title="Where it went">
          {categoryBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">No spending this month.</p>
          ) : (
            <div className="space-y-2.5">
              {categoryBreakdown.slice(0, 8).map((c) => (
                <div key={c.category_id ?? "none"}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-neutral-700">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                    <span className="font-medium text-neutral-900">
                      {formatAmount(c.spent, baseCurrency)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${topSpend > 0 ? (c.spent / topSpend) * 100 : 0}%`,
                        backgroundColor: c.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Budgets */}
      <Card
        title="Budgets"
        action={
          <button
            onClick={() => setModal("budgets")}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            Set budgets
          </button>
        }
      >
        {budgetRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">
            No budgets set for this month yet.
          </p>
        ) : (
          <div className="space-y-3">
            {budgetRows.map((b) => {
              const pct = b.budget > 0 ? (b.spent / b.budget) * 100 : 0;
              const over = b.spent > b.budget;
              return (
                <div key={b.category_id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-neutral-700">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                      {b.name}
                    </span>
                    <span className={over ? "font-medium text-red-600" : "text-neutral-500"}>
                      {formatAmount(b.spent, baseCurrency)} / {formatAmount(b.budget, baseCurrency)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${over ? "bg-red-500" : "bg-neutral-900"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Accounts */}
      <Card
        title="Accounts"
        action={
          <button
            onClick={() => setModal("accounts")}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            Manage
          </button>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {accountBalances
            .filter((a) => !a.account.archived)
            .map((a) => (
              <div
                key={a.account.id}
                className="flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2.5"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: a.account.color ?? "#737373" }}
                />
                <span className="flex-1 truncate text-sm text-neutral-700">{a.account.name}</span>
                <span className="text-sm font-semibold text-neutral-900">
                  {formatAmount(a.balance, baseCurrency)}
                </span>
              </div>
            ))}
          {accountBalances.filter((a) => !a.account.archived).length === 0 && (
            <p className="text-sm text-neutral-400">No active accounts.</p>
          )}
        </div>
      </Card>

      {/* Ledger */}
      <Card
        title="Transactions"
        action={
          <button
            onClick={() => setModal("categories")}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            Categories
          </button>
        }
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchant, note, category…"
          className="mb-4 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
        {grouped.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">
            {transactions.length === 0
              ? "No transactions this month. Add your first one."
              : "Nothing matches your search."}
          </p>
        ) : (
          <div className="space-y-5">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {formatDateLabel(date)}
                </p>
                <div className="divide-y divide-neutral-100">
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openEdit(t)}
                      className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-neutral-50"
                    >
                      <span
                        className="h-8 w-8 shrink-0 rounded-full"
                        style={{ backgroundColor: (t.category_color ?? "#a3a3a3") + "22" }}
                      >
                        <span
                          className="block h-full w-full rounded-full"
                          style={{
                            border: `2px solid ${t.category_color ?? "#a3a3a3"}`,
                          }}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {t.merchant || t.category_name || "Transaction"}
                        </p>
                        <p className="truncate text-xs text-neutral-500">
                          {t.category_name ?? "Uncategorized"}
                          {t.account_name ? ` · ${t.account_name}` : ""}
                          {t.scope === "business" ? " · Business" : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold ${
                          t.kind === "income" ? "text-green-600" : "text-neutral-900"
                        }`}
                      >
                        {formatSigned(t.amount, t.kind, baseCurrency)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modals */}
      <TransactionSlideOver
        open={txOpen}
        mode={txMode}
        transaction={editingTx}
        categories={categories}
        accounts={accounts.filter((a) => !a.archived)}
        baseCurrency={baseCurrency}
        defaultScope={defaultScopeForForm()}
        onClose={() => setTxOpen(false)}
        onSave={handleSaveTx}
        onDelete={txMode === "edit" ? handleDeleteTx : undefined}
      />
      <BudgetModal
        open={modal === "budgets"}
        monthLabel={monthLabel(monthDate)}
        categories={categories}
        budgetRows={budgetRows}
        baseCurrency={baseCurrency}
        onClose={() => setModal("none")}
        onSetBudget={handleSetBudget}
      />
      <AccountsModal
        open={modal === "accounts"}
        accounts={accounts}
        balances={balanceMap}
        baseCurrency={baseCurrency}
        onClose={() => setModal("none")}
        onSave={handleSaveAccount}
        onDelete={handleDeleteAccount}
      />
      <CategoriesModal
        open={modal === "categories"}
        categories={categories}
        onClose={() => setModal("none")}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "green" | "red";
}) {
  const toneClass =
    tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : "text-neutral-900";
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
