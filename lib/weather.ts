// Open-Meteo: free, no key, ~14-day forecast horizon.
// Two endpoints: geocoding (text → lat/lng) and forecast (lat/lng → daily).

import { cache } from "react";

const GEO_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";

export type Geocoded = {
  lat: number;
  lng: number;
  name: string;
  country: string | null;
  timezone: string;
};

export type DailyForecast = {
  date: string; // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  precipChance: number; // 0-100
  weatherCode: number; // WMO code
};

export const geocode = cache(async function geocode(name: string): Promise<Geocoded | null> {
  if (!name.trim()) return null;
  try {
    const res = await fetch(
      `${GEO_BASE}?name=${encodeURIComponent(name.trim())}&count=1&language=en&format=json`,
      { next: { revalidate: 86400 } } // 24h cache
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        latitude: number;
        longitude: number;
        name: string;
        country?: string;
        timezone: string;
      }>;
    };
    const first = data.results?.[0];
    if (!first) return null;
    return {
      lat: first.latitude,
      lng: first.longitude,
      name: first.name,
      country: first.country ?? null,
      timezone: first.timezone,
    };
  } catch {
    return null;
  }
});

export async function getForecast(args: {
  lat: number;
  lng: number;
  startDate: string;
  endDate: string;
  timezone?: string;
}): Promise<DailyForecast[]> {
  // Open-Meteo supports up to ~16 days out. Clip the window.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 16);

  const reqStart = new Date(Math.max(today.getTime(), new Date(args.startDate + "T00:00:00").getTime()));
  const reqEnd = new Date(Math.min(horizon.getTime(), new Date(args.endDate + "T00:00:00").getTime()));
  if (reqEnd < reqStart) return [];

  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `${FORECAST_BASE}?latitude=${args.lat}&longitude=${args.lng}` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
        `&temperature_unit=fahrenheit` +
        `&timezone=${encodeURIComponent(args.timezone ?? "auto")}` +
        `&start_date=${toISO(reqStart)}&end_date=${toISO(reqEnd)}`,
      { next: { revalidate: 3600 } } // 1h cache
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        weather_code: number[];
        precipitation_probability_max: (number | null)[];
      };
    };
    return data.daily.time.map((date, i) => ({
      date,
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      precipChance: data.daily.precipitation_probability_max[i] ?? 0,
      weatherCode: data.daily.weather_code[i],
    }));
  } catch {
    return [];
  }
}

// WMO weather code → short label + emoji.
// https://open-meteo.com/en/docs (search "WMO Weather interpretation codes")
export function weatherCodeMeta(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code === 1) return { label: "Mostly clear", icon: "🌤" };
  if (code === 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "🌫" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "🌦" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: "🌧" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "🌨" };
  if (code >= 80 && code <= 82) return { label: "Showers", icon: "🌦" };
  if (code === 95) return { label: "Thunderstorm", icon: "⛈" };
  if (code >= 96 && code <= 99) return { label: "Thunder + hail", icon: "⛈" };
  return { label: "—", icon: "🌡" };
}
