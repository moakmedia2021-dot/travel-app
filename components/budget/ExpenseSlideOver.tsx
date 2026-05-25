"use client";

import { useEffect, useMemo, useState } from "react";
import type { Expense, SplitType, TripMember } from "@/lib/types";
import { CURRENCIES } from "@/lib/currencies";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "./categoryConfig";
import { MemberAvatar, memberDisplayName } from "./MemberAvatar";
import type { ExpenseInput } from "@/app/actions/expenses";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  expense: Expense | null;
  members: TripMember[];
  currentUserId: string;
  tripCurrency: string;
  onClose: () => void;
  onSave: (input: ExpenseInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

type FormState = {
  title: string;
  amount: string;
  currency: string;
  category: string;
  date: string;
  paid_by: string;
  split_type: SplitType;
  // per-member: included flag + amount (string for input)
  splits: { user_id: string; included: boolean; amount: string }[];
};

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function defaultForm(
  members: TripMember[],
  currentUserId: string,
  tripCurrency: string
): FormState {
  return {
    title: "",
    amount: "",
    currency: tripCurrency || "USD",
    category: "food",
    date: today(),
    paid_by: currentUserId,
    split_type: "equal",
    splits: members.map((m) => ({
      user_id: m.user_id,
      included: true,
      amount: "0",
    })),
  };
}

function expenseToForm(
  expense: Expense,
  members: TripMember[]
): FormState {
  const splitMap = new Map(
    expense.expense_splits.map((s) => [s.user_id, Number(s.amount_owed)])
  );
  return {
    title: expense.title,
    amount: String(expense.amount),
    currency: expense.currency,
    category: (expense.category ?? "misc") as string,
    date: expense.date,
    paid_by: expense.paid_by,
    split_type: expense.split_type,
    splits: members.map((m) => ({
      user_id: m.user_id,
      included: splitMap.has(m.user_id),
      amount: splitMap.has(m.user_id) ? String(splitMap.get(m.user_id)) : "0",
    })),
  };
}

export default function ExpenseSlideOver({
  open,
  mode,
  expense,
  members,
  currentUserId,
  tripCurrency,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [form, setForm] = useState<FormState>(() =>
    defaultForm(members, currentUserId, tripCurrency)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setDeleting(false);
    if (mode === "edit" && expense) setForm(expenseToForm(expense, members));
    else setForm(defaultForm(members, currentUserId, tripCurrency));
  }, [open, mode, expense, members, currentUserId, tripCurrency]);

  // For equal split, auto-recalculate amounts when amount or included members change
  const totalAmount = Number(form.amount) || 0;
  const includedCount = form.splits.filter((s) => s.included).length;

  const computedSplits = useMemo(() => {
    if (form.split_type !== "equal") return form.splits;
    if (includedCount === 0 || totalAmount === 0) return form.splits;
    const per = round2(totalAmount / includedCount);
    // Distribute rounding remainder to first included
    const allocated = round2(per * includedCount);
    const remainder = round2(totalAmount - allocated);
    let first = true;
    return form.splits.map((s) => {
      if (!s.included) return { ...s, amount: "0" };
      const amt = first ? round2(per + remainder) : per;
      first = false;
      return { ...s, amount: amt.toFixed(2) };
    });
  }, [form.split_type, form.splits, includedCount, totalAmount]);

  const splitSum = computedSplits
    .filter((s) => s.included)
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const splitDiff = round2(totalAmount - splitSum);
  const splitValid = Math.abs(splitDiff) < 0.01;

  if (!open) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateSplit(userId: string, patch: { included?: boolean; amount?: string }) {
    setForm((f) => ({
      ...f,
      splits: f.splits.map((s) =>
        s.user_id === userId ? { ...s, ...patch } : s
      ),
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) return setError("Title is required");
    if (!form.amount || Number(form.amount) <= 0)
      return setError("Amount must be greater than 0");
    if (!form.paid_by) return setError("Pick who paid");

    const splitsToSave = computedSplits
      .filter((s) => s.included && Number(s.amount) > 0)
      .map((s) => ({ user_id: s.user_id, amount_owed: Number(s.amount) }));

    if (splitsToSave.length === 0) return setError("At least one person must be in the split");
    if (!splitValid) return setError(`Splits must total ${form.amount}`);

    setSaving(true);
    setError(null);

    try {
      await onSave({
        title: form.title,
        amount: Number(form.amount),
        currency: form.currency,
        category: form.category,
        date: form.date,
        paid_by: form.paid_by,
        split_type: form.split_type,
        splits: splitsToSave,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Delete this expense?")) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  }

  function findProfile(userId: string) {
    return members.find((m) => m.user_id === userId)?.profile;
  }

  return (
    <div className="fixed inset-0 z-50" aria-modal>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            {mode === "add" ? "New expense" : "Edit expense"}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Field label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Dinner at Sushi Saito"
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Amount" required>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="0.00"
                className={`${inputBaseClass} min-w-0 flex-1`}
              />
              <select
                value={form.currency}
                onChange={(e) => update("currency", e.target.value)}
                className={`${inputBaseClass} w-24 shrink-0`}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Category">
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORY_ORDER.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const active = form.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => update("category", cat)}
                    className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-xs transition-colors ${
                      active
                        ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                        : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${cfg.iconBg} ${cfg.iconColor}`}>
                      {cfg.icon}
                    </span>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Paid by">
              <select
                value={form.paid_by}
                onChange={(e) => update("paid_by", e.target.value)}
                className={inputClass}
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {memberDisplayName(m.profile)}
                    {m.user_id === currentUserId ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Split section */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700">Split</label>
              <div className="flex gap-1 rounded-md bg-neutral-100 p-0.5 text-xs">
                {(["equal", "custom"] as SplitType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update("split_type", t)}
                    className={`rounded px-2 py-1 font-medium capitalize transition-colors ${
                      form.split_type === t
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 rounded-lg border border-neutral-200 p-2">
              {computedSplits.map((s) => {
                const profile = findProfile(s.user_id);
                return (
                  <label
                    key={s.user_id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={s.included}
                      onChange={(e) =>
                        updateSplit(s.user_id, { included: e.target.checked })
                      }
                      className="h-4 w-4 accent-neutral-900"
                    />
                    <MemberAvatar profile={profile} size={22} />
                    <span className="flex-1 truncate text-sm text-neutral-700">
                      {memberDisplayName(profile)}
                    </span>
                    {form.split_type === "custom" ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={!s.included}
                        value={s.amount}
                        onChange={(e) => updateSplit(s.user_id, { amount: e.target.value })}
                        className={`${inputBaseClass} w-24 text-right disabled:opacity-40`}
                      />
                    ) : (
                      <span
                        className={`w-24 text-right text-sm tabular-nums ${
                          s.included ? "text-neutral-900" : "text-neutral-300"
                        }`}
                      >
                        {s.included ? `${form.currency} ${s.amount}` : "—"}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {form.split_type === "custom" && totalAmount > 0 && (
              <p
                className={`mt-1.5 text-xs ${
                  splitValid ? "text-neutral-500" : "text-amber-600"
                }`}
              >
                Splits total: {splitSum.toFixed(2)} / {totalAmount.toFixed(2)}{" "}
                {splitValid
                  ? "✓"
                  : splitDiff > 0
                    ? `(${splitDiff.toFixed(2)} unallocated)`
                    : `(over by ${(-splitDiff).toFixed(2)})`}
              </p>
            )}
          </div>

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
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
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
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : mode === "add" ? "Add expense" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputBaseClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";
const inputClass = `block w-full ${inputBaseClass}`;

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
