// Duffel API wrapper. Test mode returns mock-but-realistic data.
// Auth is a single bearer token (no OAuth dance like Amadeus).

const BASE = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

export function hasDuffelKey(): boolean {
  return !!process.env.DUFFEL_TOKEN;
}

export class DuffelError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

async function duffelFetch<T>(
  path: string,
  init: { method?: string; body?: object; params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const token = process.env.DUFFEL_TOKEN;
  if (!token) throw new DuffelError("Duffel token not configured");

  const url = new URL(`${BASE}${path}`);
  if (init.params) {
    Object.entries(init.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": DUFFEL_VERSION,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (res.status === 429) throw new DuffelError("Duffel rate limit hit. Try again in a minute.", 429);
  if (!res.ok) {
    const body = await res.text();
    throw new DuffelError(`${res.status} ${body.slice(0, 300)}`, res.status);
  }
  return (await res.json()) as T;
}

// ---------- Places (typeahead) ----------

export type DuffelPlace = {
  iataCode: string;
  name: string;
  cityName: string | null;
  countryName: string | null;
  subType: "AIRPORT" | "CITY";
  latitude: number | null;
  longitude: number | null;
};

// Kept name (AmadeusLocation) and shape so existing UI doesn't have to change.
export type AmadeusLocation = DuffelPlace;

export async function searchLocations(query: string): Promise<DuffelPlace[]> {
  if (query.trim().length < 2) return [];
  type Resp = {
    data: Array<{
      iata_code: string | null;
      name: string;
      type: "airport" | "city";
      city_name?: string | null;
      country_name?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }>;
  };
  const data = await duffelFetch<Resp>("/places/suggestions", {
    params: { query: query.trim() },
  });
  return data.data
    .filter((d) => !!d.iata_code)
    .map((d) => ({
      iataCode: d.iata_code as string,
      name: d.name,
      cityName: d.city_name ?? null,
      countryName: d.country_name ?? null,
      subType: d.type === "airport" ? "AIRPORT" : "CITY",
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
    }));
}

// ---------- Flight offers ----------

export type FlightSegment = {
  carrierCode: string;
  number: string;
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  duration: string;
};

export type FlightOffer = {
  id: string;
  totalPrice: number;
  currency: string;
  perAdult: number | null;
  outbound: FlightSegment[];
  returnSegments: FlightSegment[] | null;
  totalDurationMinutes: number;
  stops: number;
  airlineCodes: string[];
};

function isoDurationToMinutes(d: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(d);
  if (!m) return 0;
  return parseInt(m[1] || "0") * 60 + parseInt(m[2] || "0");
}

type DuffelOfferRequestResp = {
  data: {
    id: string;
    offers: Array<{
      id: string;
      total_amount: string;
      total_currency: string;
      passengers: Array<{ id: string }>;
      slices: Array<{
        duration: string;
        segments: Array<{
          marketing_carrier: { iata_code: string };
          marketing_carrier_flight_number: string;
          departing_at: string;
          arriving_at: string;
          duration: string;
          origin: { iata_code: string };
          destination: { iata_code: string };
        }>;
      }>;
    }>;
  };
};

export async function searchFlights(args: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  currencyCode?: string;
}): Promise<FlightOffer[]> {
  const slices = [
    { origin: args.origin.toUpperCase(), destination: args.destination.toUpperCase(), departure_date: args.departureDate },
  ];
  if (args.returnDate) {
    slices.push({
      origin: args.destination.toUpperCase(),
      destination: args.origin.toUpperCase(),
      departure_date: args.returnDate,
    });
  }
  const passengers = Array.from({ length: Math.max(1, args.adults) }, () => ({ type: "adult" }));

  // ?return_offers=true makes the response include offers inline (single call)
  const data = await duffelFetch<DuffelOfferRequestResp>(
    "/air/offer_requests",
    {
      method: "POST",
      params: { return_offers: "true" },
      body: { data: { slices, passengers, cabin_class: "economy" } },
    }
  );

  // Sort by total ascending, take top 10
  const offers = [...data.data.offers]
    .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
    .slice(0, 10);

  return offers.map((o): FlightOffer => {
    const outboundSegs = (o.slices[0]?.segments ?? []).map(toSegment);
    const returnSegs = o.slices[1] ? o.slices[1].segments.map(toSegment) : null;
    const stops = Math.max(0, outboundSegs.length - 1);
    const outDur = isoDurationToMinutes(o.slices[0]?.duration ?? "PT0M");
    const retDur = o.slices[1] ? isoDurationToMinutes(o.slices[1].duration) : 0;
    const carriers = Array.from(
      new Set([...outboundSegs, ...(returnSegs ?? [])].map((s) => s.carrierCode))
    );
    const total = parseFloat(o.total_amount);
    const adults = o.passengers.length;
    return {
      id: o.id,
      totalPrice: total,
      currency: o.total_currency,
      perAdult: adults > 0 ? Math.round((total / adults) * 100) / 100 : null,
      outbound: outboundSegs,
      returnSegments: returnSegs,
      totalDurationMinutes: outDur + retDur,
      stops,
      airlineCodes: carriers,
    };
  });
}

type DuffelSegment = DuffelOfferRequestResp["data"]["offers"][number]["slices"][number]["segments"][number];

function toSegment(s: DuffelSegment): FlightSegment {
  return {
    carrierCode: s.marketing_carrier.iata_code,
    number: s.marketing_carrier_flight_number,
    departure: { iataCode: s.origin.iata_code, at: s.departing_at },
    arrival: { iataCode: s.destination.iata_code, at: s.arriving_at },
    duration: s.duration,
  };
}

// ---------- Stays (hotels) ----------

export type HotelOffer = {
  hotelId: string;
  name: string;
  cityCode: string;
  rating: number | null;
  distanceKm: number | null;
  totalPrice: number;
  currency: string;
  nights: number;
  perNight: number;
};

type DuffelStaysSearchResp = {
  data: {
    results: Array<{
      id: string;
      accommodation: {
        id: string;
        name: string;
        rating: number | null;
        location: {
          geographic_coordinates?: { latitude: number; longitude: number };
        };
        address: { city_name?: string; line_one?: string };
      };
      cheapest_rate_total_amount: string;
      cheapest_rate_currency: string;
    }>;
  };
};

function nightsBetween(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function searchHotels(args: {
  latitude: number;
  longitude: number;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  rooms?: number;
}): Promise<HotelOffer[]> {
  const guests = Array.from({ length: Math.max(1, args.adults) }, () => ({ type: "adult" }));
  const data = await duffelFetch<DuffelStaysSearchResp>("/stays/search", {
    method: "POST",
    body: {
      data: {
        rooms: args.rooms ?? 1,
        check_in_date: args.checkInDate,
        check_out_date: args.checkOutDate,
        guests,
        location: {
          radius: 10,
          geographic_coordinates: { latitude: args.latitude, longitude: args.longitude },
        },
      },
    },
  });

  const nights = nightsBetween(args.checkInDate, args.checkOutDate);

  return data.data.results
    .map((r): HotelOffer => {
      const total = parseFloat(r.cheapest_rate_total_amount);
      const coords = r.accommodation.location.geographic_coordinates;
      const dist = coords
        ? haversineKm(args.latitude, args.longitude, coords.latitude, coords.longitude)
        : null;
      return {
        hotelId: r.accommodation.id,
        name: r.accommodation.name,
        cityCode: r.accommodation.address.city_name ?? "",
        rating: r.accommodation.rating,
        distanceKm: dist,
        totalPrice: total,
        currency: r.cheapest_rate_currency,
        nights,
        perNight: total / nights,
      };
    })
    .sort((a, b) => a.totalPrice - b.totalPrice)
    .slice(0, 20);
}
