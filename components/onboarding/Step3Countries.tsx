"use client";

import CountriesPicker from "@/components/profile/CountriesPicker";
import WorldMap from "@/components/profile/WorldMap";

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function Step3Countries({ value, onChange, onBack, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Where have you been?
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Add the countries you've visited. Watch the map fill in.
        </p>
      </div>

      <WorldMap visited={value} height={260} />

      <CountriesPicker selected={value} onChange={onChange} />

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={onNext}
            className="rounded-md px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            Skip for now
          </button>
          <button
            onClick={onNext}
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
