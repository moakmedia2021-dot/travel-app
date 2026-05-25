"use client";

const TAGS = [
  { id: "solo", label: "Solo traveler", icon: "🧳" },
  { id: "budget", label: "Budget backpacker", icon: "🎒" },
  { id: "luxury", label: "Luxury traveler", icon: "✨" },
  { id: "digital_nomad", label: "Digital nomad", icon: "💻" },
  { id: "adventure", label: "Adventure seeker", icon: "🏔️" },
  { id: "foodie", label: "Foodie", icon: "🍜" },
  { id: "photographer", label: "Photographer", icon: "📷" },
  { id: "family", label: "Family traveler", icon: "👨‍👩‍👧" },
  { id: "road_tripper", label: "Road tripper", icon: "🚐" },
  { id: "cruise", label: "Cruise lover", icon: "🚢" },
];

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function Step2Style({ value, onChange, onBack, onNext }: Props) {
  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }
  const canContinue = value.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
          What kind of traveler are you?
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Pick at least one. We use these to match you with people on similar trips.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TAGS.map((t) => {
          const active = value.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-5 transition-all ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-md"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Continue ({value.length})
        </button>
      </div>
    </div>
  );
}
