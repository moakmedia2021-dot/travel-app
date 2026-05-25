"use client";

import { useState } from "react";

type TripData = {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  visibility: "private" | "group" | "public";
};

type Props = {
  onBack: () => void;
  onSubmit: (trip: TripData | null) => Promise<void>;
};

export default function Step4FirstTrip({ onBack, onSubmit }: Props) {
  const [mode, setMode] = useState<"choose" | "createTrip">("choose");
  const [trip, setTrip] = useState<TripData>({
    title: "",
    destination: "",
    start_date: "",
    end_date: "",
    visibility: "private",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSkip() {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setSubmitting(false);
    }
  }

  async function handleCreate() {
    if (!trip.title.trim()) {
      setError("Give your trip a name");
      return;
    }
    if (trip.start_date && trip.end_date && trip.end_date < trip.start_date) {
      setError("End date must be after start date");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trip);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setSubmitting(false);
    }
  }

  if (mode === "choose") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Almost there. What's next?
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Set up your first trip or just look around.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("createTrip")}
            className="group rounded-2xl border border-neutral-200 bg-white p-6 text-left transition-all hover:border-neutral-900 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
              ✈️
            </div>
            <h3 className="mt-4 text-base font-semibold text-neutral-900">
              I have a trip coming up
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Add the basics now. We'll help you plan day-by-day.
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-neutral-900">
              Add trip →
            </span>
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="group rounded-2xl border border-neutral-200 bg-white p-6 text-left transition-all hover:border-neutral-900 hover:shadow-md disabled:opacity-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl">
              🧭
            </div>
            <h3 className="mt-4 text-base font-semibold text-neutral-900">
              Just exploring for now
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Browse other travelers and trip ideas first.
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-neutral-900">
              {submitting ? "Setting up…" : "Take me to discover →"}
            </span>
          </button>
        </div>

        <div className="flex justify-start">
          <button
            onClick={onBack}
            disabled={submitting}
            className="rounded-md px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            ← Back
          </button>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </div>
    );
  }

  // Mini trip creation form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Tell me about your trip
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Just the basics — you can flesh it out after.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Trip name" required>
          <input
            type="text"
            value={trip.title}
            onChange={(e) => setTrip({ ...trip, title: e.target.value })}
            placeholder="Summer in Japan"
            className={inputClass}
            autoFocus
          />
        </Field>

        <Field label="Destination">
          <input
            type="text"
            value={trip.destination}
            onChange={(e) => setTrip({ ...trip, destination: e.target.value })}
            placeholder="Tokyo, Japan"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input
              type="date"
              value={trip.start_date}
              onChange={(e) => setTrip({ ...trip, start_date: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={trip.end_date}
              min={trip.start_date || undefined}
              onChange={(e) => setTrip({ ...trip, end_date: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Who's going?">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTrip({ ...trip, visibility: "private" })}
              className={`rounded-md border px-3 py-2.5 text-sm transition-colors ${
                trip.visibility === "private"
                  ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
              }`}
            >
              <div className="font-medium">Just me</div>
            </button>
            <button
              type="button"
              onClick={() => setTrip({ ...trip, visibility: "group" })}
              className={`rounded-md border px-3 py-2.5 text-sm transition-colors ${
                trip.visibility === "group"
                  ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
              }`}
            >
              <div className="font-medium">With others</div>
            </button>
          </div>
        </Field>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setMode("choose")}
          disabled={submitting}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={handleCreate}
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create trip & finish"}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

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
