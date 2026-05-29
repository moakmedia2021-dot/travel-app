"use client";

import { useEffect, useState } from "react";
import SheetHandle from "@/components/ui/SheetHandle";
import { todayISO } from "@/lib/finance/format";
import type {
  EnrichedTransaction,
  FinanceAccount,
  FinanceCategory,
  FinanceKind,
  FinanceScope,
  TransactionInput,
} from "@/lib/finance/types";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  transaction: EnrichedTransaction | null;
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  baseCurrency: string;
  defaultScope: FinanceScope;
  onClose: () => void;
  onSave: (input: TransactionInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

type FormState = {
  kind: FinanceKind;
  amount: string;
  scope: FinanceScope;
  occurred_on: string;
  category_id: string;
  account_id: string;
  merchant: string;
  note: string;
};

function defaultForm(defaultScope: FinanceScope): FormState {
  return {
    kind: "expense",
    amount: "",
    scope: defaultScope,
    occurred_on: todayISO(),
    category_id: "",
    account_id: "",
    merchant: "",
    note: "",
  };
}

function txToForm(t: EnrichedTransaction): FormState {
  return {
    kind: t.kind,
    amount: String(t.amount),
    scope: t.scope,
    occurred_on: t.occurred_on,
    category_id: t.category_id ?? "",
    account_id: t.account_id ?? "",
    merchant: t.merchant ?? "",
    note: t.note ?? "",
  };
}

export default function TransactionSlideOver({
  open,
  mode,
  transaction,
  categories,
  accounts,
  baseCurrency,
  defaultScope,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [form, setForm] = useState<FormState>(() => defaultForm(defaultScope));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setDeleting(false);
    setForm(mode === "edit" && transaction ? txToForm(transaction) : defaultForm(defaultScope));
  }, [open, mode, transaction, defaultScope]);

  if (!open) return null;

  const visibleCategories = categories.filter((c) => c.kind === form.kind);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setKind(kind: FinanceKind) {
    // Reset category when switching kind so we never keep an income category on an expense.
    setForm((f) => ({ ...f, kind, category_id: "" }));
  }

  async function handleSave() {
    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: transaction?.id ?? null,
        occurred_on: form.occurred_on,
        amount: Math.round(amount * 100) / 100,
        kind: form.kind,
        scope: form.scope,
        category_id: form.category_id || null,
        account_id: form.account_id || null,
        merchant: form.merchant.trim() || null,
        note: form.note.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Delete this transaction?")) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50" aria-modal>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <SheetHandle />
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            {mode === "add" ? "New transaction" : "Edit transaction"}
          </h2>
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

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* Income / Expense */}
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as FinanceKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  form.kind === k
                    ? k === "income"
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-red-500 bg-red-50 text-red-700"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <Field label="Amount" required>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">{baseCurrency}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="0.00"
                className={inputClass}
                autoFocus
              />
            </div>
          </Field>

          {/* Personal / Business */}
          <Field label="Scope">
            <div className="grid grid-cols-2 gap-2">
              {(["personal", "business"] as FinanceScope[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update("scope", s)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    form.scope === s
                      ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                      : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={form.occurred_on}
                onChange={(e) => update("occurred_on", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Category">
              <select
                value={form.category_id}
                onChange={(e) => update("category_id", e.target.value)}
                className={inputClass}
              >
                <option value="">Uncategorized</option>
                {visibleCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Account">
            <select
              value={form.account_id}
              onChange={(e) => update("account_id", e.target.value)}
              className={inputClass}
            >
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={form.kind === "income" ? "Source" : "Merchant"}>
            <input
              type="text"
              value={form.merchant}
              onChange={(e) => update("merchant", e.target.value)}
              placeholder={form.kind === "income" ? "Client, employer…" : "Where you spent it"}
              className={inputClass}
            />
          </Field>

          <Field label="Note">
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              rows={2}
              placeholder="Optional details"
              className={inputClass}
            />
          </Field>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-5 py-4">
          {mode === "edit" && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : mode === "add" ? "Add" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
