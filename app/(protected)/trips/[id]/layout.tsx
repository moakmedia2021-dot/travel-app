import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TripHeader from "@/components/TripHeader";
import TripTabs from "@/components/TripTabs";
import WeatherStrip from "@/components/weather/WeatherStrip";
import { geocode, getForecast } from "@/lib/weather";
import type { Trip } from "@/lib/types";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !trip) notFound();
  const t = trip as Trip;

  // Best-effort weather: needs destination + dates within ~16 days.
  let forecast: Awaited<ReturnType<typeof getForecast>> = [];
  if (t.destination && t.start_date && t.end_date) {
    const geo = await geocode(t.destination);
    if (geo) {
      forecast = await getForecast({
        lat: geo.lat,
        lng: geo.lng,
        startDate: t.start_date,
        endDate: t.end_date,
        timezone: geo.timezone,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <TripHeader trip={t} compact />
        {forecast.length > 0 && <WeatherStrip forecast={forecast} />}
      </div>
      <TripTabs tripId={id} />
      <div>{children}</div>
    </div>
  );
}
