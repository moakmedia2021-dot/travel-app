import { weatherCodeMeta, type DailyForecast } from "@/lib/weather";

function formatDay(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

export default function WeatherStrip({
  forecast,
}: {
  forecast: DailyForecast[];
}) {
  if (forecast.length === 0) return null;

  return (
    <div className="border-t border-neutral-100 px-5 py-3 sm:px-6">
      <div className="-mx-1 flex gap-1 overflow-x-auto">
        {forecast.slice(0, 7).map((d) => {
          const meta = weatherCodeMeta(d.weatherCode);
          return (
            <div
              key={d.date}
              className="min-w-[64px] shrink-0 rounded-md bg-neutral-50 px-2 py-1.5 text-center"
              title={meta.label}
            >
              <div className="text-[10px] font-medium text-neutral-500">
                {formatDay(d.date)}
              </div>
              <div className="text-lg leading-none">{meta.icon}</div>
              <div className="mt-0.5 text-[11px] tabular-nums text-neutral-700">
                <span className="font-semibold">{d.tempMax}°</span>
                <span className="text-neutral-400"> / {d.tempMin}°</span>
              </div>
            </div>
          );
        })}
        {forecast.length > 7 && (
          <div className="flex min-w-[60px] shrink-0 items-center justify-center px-2 text-[11px] text-neutral-400">
            +{forecast.length - 7} more
          </div>
        )}
      </div>
    </div>
  );
}
