"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/app/actions/trips";
import { CURRENCIES } from "@/lib/currencies";
import type { TripVisibility } from "@/lib/types";
import SheetHandle from "@/components/ui/SheetHandle";

type Props = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  visibility: TripVisibility;
  budget: string; // string so we can leave it empty
  currency: string;
};

const initialState: FormState = {
  title: "",
  destination: "",
  startDate: "",
  endDate: "",
  travelers: 1,
  visibility: "private",
  budget: "",
  currency: "USD",
};

export default function NewTripModal({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset() {
    setStep(1);
    setForm(initialState);
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validateStep(s: 1 | 2 | 3): string | null {
    if (s === 1) {
      if (!form.title.trim()) return "Trip name is required";
      if (form.startDate && form.endDate && form.endDate < form.startDate) {
        return "End date must be after start date";
      }
    }
    if (s === 2) {
      if (form.travelers < 1) return "At least 1 traveler is required";
    }
    if (s === 3) {
      if (form.budget && Number(form.budget) < 0) return "Budget can't be negative";
    }
    return null;
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  }

  function handleBack() {
    setError(null);
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
  }

  async function handleSubmit() {
    const err = validateStep(3);
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await createTrip({
      title: form.title,
      destination: form.destination || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      travelers: form.travelers,
      visibility: form.visibility,
      budgetTotal: form.budget ? Number(form.budget) : null,
      currency: form.budget ? form.currency : null,
    });

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/trips/${result.id}`);
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/50 px-0 sm:px-4"
      onClick={handleClose}
    >
      <div
        className="relative flex h-[100dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHandle />
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">New trip</h2>
          <button
            onClick={handleClose}
            className="flex h-11 w-11 items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Close"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 px-6 pt-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full transition-colors ${
                n <= step ? "bg-neutral-900" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>
        <p className="px-6 pt-2 text-xs text-neutral-500">Step {step} of 3</p>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              <Field label="Trip name" required>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Summer in Japan"
                  className={inputClass}
                  autoFocus
                />
              </Field>

              <Field label="Destination">
                <input
                  type="text"
                  value={form.destination}
                  onChange={(e) => update("destination", e.target.value)}
                  placeholder="Tokyo, Japan"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="End date">
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => update("endDate", e.target.value)}
                    min={form.startDate || undefined}
                    className={inputClass}
                  />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Number of travelers">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.travelers}
                  onChange={(e) => update("travelers", Math.max(1, Number(e.target.value) || 1))}
                  className={inputClass}
                />
              </Field>

              <Field label="Visibility">
                <div className="space-y-2">
                  {(
                    [
                      { v: "private", t: "Just me", d: "Only you can see this trip" },
                      { v: "group", t: "Group", d: "Visible to invited members" },
                      { v: "public", t: "Public", d: "Anyone with the link can view" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.v}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        form.visibility === opt.v
                          ? "border-neutral-900 bg-neutral-50"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        checked={form.visibility === opt.v}
                        onChange={() => update("visibility", opt.v)}
                        className="mt-0.5 h-4 w-4 accent-neutral-900"
                      />
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{opt.t}</div>
                        <div className="text-xs text-neutral-500">{opt.d}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Total budget (optional)">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.budget}
                    onChange={(e) => update("budget", e.target.value)}
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
                <p className="mt-1 text-xs text-neutral-500">
                  You can add expenses and track spending against this.
                </p>
              </Field>
            </>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:pb-4">
          <button
            onClick={step === 1 ? handleClose : handleBack}
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating…" : "Create trip"}
            </button>
          )}
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
