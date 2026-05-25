"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTrip, deleteTrip, type UpdateTripInput } from "@/app/actions/trips";
import { CURRENCIES } from "@/lib/currencies";
import type { Trip, TripStatus, TripVisibility } from "@/lib/types";

type Props = {
  trip: Trip;
  canEdit: boolean;
  isOwner: boolean;
};

const STATUSES: TripStatus[] = ["draft", "planned", "active", "completed"];
const VISIBILITIES: { v: TripVisibility; label: string; desc: string }[] = [
  { v: "private", label: "Just me", desc: "Only you can see this trip" },
  { v: "group", label: "Group", desc: "Visible to invited members" },
  { v: "public", label: "Public", desc: "Anyone with the link" },
];

export default function TripDetailsForm({ trip, canEdit, isOwner }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: trip.title,
    destination: trip.destination ?? "",
    start_date: trip.start_date ?? "",
    end_date: trip.end_date ?? "",
    status: trip.status as TripStatus,
    visibility: trip.visibility as TripVisibility,
    budget: trip.budget_total != null ? String(trip.budget_total) : "",
    currency: trip.currency ?? "USD",
    travelers: trip.travelers ?? 1,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError("End date must be after start date");
      return;
    }
    setSaving(true);
    setError(null);

    const input: UpdateTripInput = {
      title: form.title,
      destination: form.destination || null,
      startDate: form.start_date || null,
      endDate: form.end_date || null,
      status: form.status,
      visibility: form.visibility,
      budgetTotal: form.budget ? Number(form.budget) : null,
      currency: form.budget ? form.currency : null,
      travelers: form.travelers,
    };

    const result = await updateTrip(trip.id, input);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${trip.title}"? This permanently removes the trip, its itinerary, expenses, and members. Cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    const result = await deleteTrip(trip.id);
    if (!result.ok) {
      setDeleting(false);
      setError(result.error);
      return;
    }
    router.push("/trips");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You're a viewer on this trip — fields are read-only.
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <Field label="Trip name" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            disabled={!canEdit}
            className={inputClass}
          />
        </Field>

        <Field label="Destination">
          <input
            type="text"
            value={form.destination}
            onChange={(e) => update("destination", e.target.value)}
            disabled={!canEdit}
            placeholder="Tokyo, Japan"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => update("start_date", e.target.value)}
              disabled={!canEdit}
              className={inputClass}
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={form.end_date}
              min={form.start_date || undefined}
              onChange={(e) => update("end_date", e.target.value)}
              disabled={!canEdit}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as TripStatus)}
              disabled={!canEdit}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Travelers">
            <input
              type="number"
              min={1}
              max={50}
              value={form.travelers}
              onChange={(e) =>
                update("travelers", Math.max(1, Number(e.target.value) || 1))
              }
              disabled={!canEdit}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Visibility">
          <div className="space-y-2">
            {VISIBILITIES.map((opt) => (
              <label
                key={opt.v}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  form.visibility === opt.v
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-300"
                } ${!canEdit ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={form.visibility === opt.v}
                  onChange={() => update("visibility", opt.v)}
                  disabled={!canEdit}
                  className="mt-0.5 h-4 w-4 accent-neutral-900"
                />
                <div>
                  <div className="text-sm font-medium text-neutral-900">{opt.label}</div>
                  <div className="text-xs text-neutral-500">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Total budget">
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.budget}
              onChange={(e) => update("budget", e.target.value)}
              disabled={!canEdit}
              placeholder="0.00"
              className={`${inputBaseClass} min-w-0 flex-1`}
            />
            <select
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
              disabled={!canEdit}
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

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {saved && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved ✓</p>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>

      {isOwner && (
        <div className="rounded-xl border border-red-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-red-700">Danger zone</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Deleting a trip removes all its itinerary items, expenses, members, and invites. This can't be undone.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete trip"}
          </button>
        </div>
      )}
    </div>
  );
}

const inputBaseClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500";
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
