type Props = { current: number; total: number };

export default function ProgressDots({ current, total }: Props) {
  return (
    <div className="flex justify-center gap-2 py-6">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              active ? "w-8 bg-neutral-900" : done ? "w-2 bg-neutral-900" : "w-2 bg-neutral-300"
            }`}
          />
        );
      })}
    </div>
  );
}
