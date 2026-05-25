"use client";

import { useEffect, useState } from "react";
import type { ItineraryItem, ItineraryType } from "@/lib/types";
import { TYPE_CONFIG, TYPE_ORDER } from "./typeConfig";
import { CURRENCIES } from "@/lib/currencies";
import type { ItineraryInput } from "@/app/actions/itinerary";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  item: ItineraryItem | null;
  defaultDay: number;
  maxDay: number;
  tripStartDate: string | null;
  onClose: () => void;
  onSave: (input: ItineraryInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

type FormState = {
  type: ItineraryType;
  title: string;
  day_number: number;
  start_time: string; // HH:MM
  end_time: string;
  location_name: string;
  price: string;
  currency: string;
  booking_ref: string;
  notes: string;
};

function emptyForm(defaultDay: number): FormState {
  return {
    type: "activity",
    title: "",
    day_number: defaultDay,
    start_time: "",
    end_time: "",
    location_name: "",
    price: "",
    currency: "USD",
    booking_ref: "",
    notes: "",
  };
}

function extractTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Combine a day (offset from trip start) + time string ("HH:MM") into ISO.
// If trip has no start date, anchor to today.
function combineToISO(
  tripStartDate: string | null,
  dayNumber: number,
  time: string
): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const base = tripStartDate ? new Date(tripStartDate + "T00:00:00") : new Date();
  base.setDate(base.getDate() + (dayNumber - 1));
  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

function itemToForm(item: ItineraryItem): FormState {
  return {
    type: item.type,
    title: item.title,
    day_number: item.day_number,
    start_time: extractTime(item.start_time),
    end_time: extractTime(item.end_time),
    location_name: item.location_name ?? "",
    price: item.price != null ? String(item.price) : "",
    currency: item.currency ?? "USD",
    booking_ref: item.booking_ref ?? "",
    notes: item.notes ?? "",
  };
}

export default function ItemSlideOver({
  open,
  mode,
  item,
  defaultDay,
  maxDay,
  tripStartDate,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm(defaultDay));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setDeleting(false);
    if (mode === "edit" && item) setForm(itemToForm(item));
    else setForm(emptyForm(defaultDay));
  }, [open, mode, item, defaultDay]);

  if (!open) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (form.start_time && form.end_time && form.end_time < form.start_time) {
      setError("End time must be after start time");
      return;
    }

    setSaving(true);
    setError(null);

    const input: ItineraryInput = {
      type: form.type,
      title: form.title,
      day_number: form.day_number,
      start_time: combineToISO(tripStartDate, form.day_number, form.start_time),
      end_time: combineToISO(tripStartDate, form.day_number, form.end_time),
      location_name: form.location_name || null,
      price: form.price ? Number(form.price) : null,
      currency: form.price ? form.currency : null,
      booking_ref: form.booking_ref || null,
      notes: form.notes || null,
    };

    try {
      await onSave(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Delete this item? This can't be undone.")) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  }

  const dayOptions = Array.from({ length: Math.max(maxDay, form.day_number) }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50" aria-modal>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            {mode === "add" ? "New itinerary item" : "Edit item"}
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

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {/* Type picker */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Type
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {TYPE_ORDER.map((t) => {
                const cfg = TYPE_CONFIG[t];
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update("type", t)}
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
          </div>

          <Field label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Flight to Tokyo"
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Day">
            <select
              value={form.day_number}
              onChange={(e) => update("day_number", Number(e.target.value))}
              className={inputClass}
            >
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time">
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => update("start_time", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="End time">
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => update("end_time", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Location">
            <input
              type="text"
              value={form.location_name}
              onChange={(e) => update("location_name", e.target.value)}
              placeholder="Narita Airport"
              className={inputClass}
            />
          </Field>

          <Field label="Price">
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
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

          <Field label="Booking reference">
            <input
              type="text"
              value={form.booking_ref}
              onChange={(e) => update("booking_ref", e.target.value)}
              placeholder="ABC123"
              className={inputClass}
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Anything to remember"
            />
          </Field>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        {/* Footer */}
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
              {saving ? "Saving…" : mode === "add" ? "Add item" : "Save changes"}
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
