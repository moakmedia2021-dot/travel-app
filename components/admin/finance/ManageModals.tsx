"use client";

import { useEffect, useState } from "react";
import SheetHandle from "@/components/ui/SheetHandle";
import { formatAmount } from "@/lib/finance/format";
import {
  ACCOUNT_TYPE_LABELS,
  FINANCE_COLORS,
  type AccountInput,
  type AccountType,
  type BudgetRow,
  type CategoryInput,
  type FinanceAccount,
  type FinanceCategory,
} from "@/lib/finance/types";

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50" aria-modal>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <SheetHandle />
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center text-neutral-400 hover:text-neutral-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FINANCE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-7 w-7 rounded-full border-2 transition-transform ${
            value === c ? "scale-110 border-neutral-900" : "border-transparent"
          }`}
          style={{ backgroundColor: c }}
          aria-label={`Color ${c}`}
        />
      ))}
    </div>
  );
}

// ---------- Budgets -----------------------------------------------------
export function BudgetModal({
  open,
  monthLabel,
  categories,
  budgetRows,
  baseCurrency,
  onClose,
  onSetBudget,
}: {
  open: boolean;
  monthLabel: string;
  categories: FinanceCategory[];
  budgetRows: BudgetRow[];
  baseCurrency: string;
  onClose: () => void;
  onSetBudget: (categoryId: string, amount: number) => Promise<void>;
}) {
  const expenseCats = categories.filter((c) => c.kind === "expense");
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const byCat = new Map(budgetRows.map((b) => [b.category_id, b.budget]));
    const init: Record<string, string> = {};
    for (const c of expenseCats) {
      const v = byCat.get(c.id);
      init[c.id] = v ? String(v) : "";
    }
    setValues(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function commit(categoryId: string) {
    const raw = values[categoryId];
    const amount = raw ? Math.round(Number(raw) * 100) / 100 : 0;
    if (isNaN(amount) || amount < 0) return;
    setSavingId(categoryId);
    try {
      await onSetBudget(categoryId, amount);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <ModalShell title={`Budgets · ${monthLabel}`} onClose={onClose}>
      <p className="text-sm text-neutral-500">
        Set a monthly spending target per category. Leave blank or 0 to clear.
      </p>
      <div className="space-y-3">
        {expenseCats.map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="flex-1 truncate text-sm text-neutral-700">{c.name}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-400">{baseCurrency}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={values[c.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))}
                onBlur={() => commit(c.id)}
                placeholder="0.00"
                className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-right text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                disabled={savingId === c.id}
              />
            </div>
          </div>
        ))}
        {expenseCats.length === 0 && (
          <p className="text-sm text-neutral-400">Add an expense category first.</p>
        )}
      </div>
    </ModalShell>
  );
}

// ---------- Accounts ----------------------------------------------------
const emptyAccount: AccountInput = {
  name: "",
  type: "checking",
  currency: "USD",
  starting_balance: 0,
  color: FINANCE_COLORS[0],
  archived: false,
};

export function AccountsModal({
  open,
  accounts,
  balances,
  baseCurrency,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  accounts: FinanceAccount[];
  balances: Map<string, number>;
  baseCurrency: string;
  onClose: () => void;
  onSave: (input: AccountInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<AccountInput | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setEditing(null);
  }, [open]);

  if (!open) return null;

  async function save() {
    if (!editing || !editing.name.trim()) return;
    setBusy(true);
    try {
      await onSave({
        ...editing,
        name: editing.name.trim(),
        starting_balance: Math.round(Number(editing.starting_balance) * 100) / 100 || 0,
      });
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this account? Transactions keep their history but lose the link.")) return;
    setBusy(true);
    try {
      await onDelete(id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Accounts" onClose={onClose}>
      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="e.g. Chase checking"
              className={inputClass}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Type</label>
              <select
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value as AccountType })}
                className={inputClass}
              >
                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Starting balance
              </label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={editing.starting_balance}
                onChange={(e) =>
                  setEditing({ ...editing, starting_balance: Number(e.target.value) })
                }
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Color</label>
            <ColorPicker
              value={editing.color ?? FINANCE_COLORS[0]}
              onChange={(c) => setEditing({ ...editing, color: c })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={editing.archived}
              onChange={(e) => setEditing({ ...editing, archived: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Archived
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || !editing.name.trim()}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save account"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2.5"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color ?? "#737373" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {a.name}
                    {a.archived && (
                      <span className="ml-2 text-xs font-normal text-neutral-400">archived</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">{ACCOUNT_TYPE_LABELS[a.type]}</p>
                </div>
                <span className="text-sm font-medium text-neutral-700">
                  {formatAmount(balances.get(a.id) ?? a.starting_balance, baseCurrency)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      id: a.id,
                      name: a.name,
                      type: a.type,
                      currency: a.currency,
                      starting_balance: a.starting_balance,
                      color: a.color,
                      archived: a.archived,
                    })
                  }
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-xs font-medium text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
            {accounts.length === 0 && (
              <p className="text-sm text-neutral-400">No accounts yet.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing({ ...emptyAccount, currency: baseCurrency })}
            className="w-full rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
          >
            + Add account
          </button>
        </>
      )}
    </ModalShell>
  );
}

// ---------- Categories --------------------------------------------------
export function CategoriesModal({
  open,
  categories,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  categories: FinanceCategory[];
  onClose: () => void;
  onSave: (input: CategoryInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<CategoryInput | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setEditing(null);
  }, [open]);

  if (!open) return null;

  async function save() {
    if (!editing || !editing.name.trim()) return;
    setBusy(true);
    try {
      await onSave({ ...editing, name: editing.name.trim() });
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this category? Existing transactions become uncategorized.")) return;
    setBusy(true);
    try {
      await onDelete(id);
    } finally {
      setBusy(false);
    }
  }

  const income = categories.filter((c) => c.kind === "income");
  const expense = categories.filter((c) => c.kind === "expense");

  return (
    <ModalShell title="Categories" onClose={onClose}>
      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="e.g. Groceries"
              className={inputClass}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["expense", "income"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setEditing({ ...editing, kind: k })}
                  className={`rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    editing.kind === k
                      ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                      : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Color</label>
            <ColorPicker value={editing.color} onChange={(c) => setEditing({ ...editing, color: c })} />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || !editing.name.trim()}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save category"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {[
            { label: "Expense", rows: expense },
            { label: "Income", rows: income },
          ].map(({ label, rows }) => (
            <div key={label} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {label}
              </h3>
              {rows.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="flex-1 truncate text-sm text-neutral-800">{c.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: c.id,
                        name: c.name,
                        kind: c.kind,
                        color: c.color,
                        sort: c.sort,
                      })
                    }
                    className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {rows.length === 0 && <p className="text-sm text-neutral-400">None yet.</p>}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setEditing({ name: "", kind: "expense", color: FINANCE_COLORS[0], sort: 0 })
            }
            className="w-full rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
          >
            + Add category
          </button>
        </>
      )}
    </ModalShell>
  );
}
