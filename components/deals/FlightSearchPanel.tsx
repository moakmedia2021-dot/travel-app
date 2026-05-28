"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FlightOffer } from "@/lib/duffel";
import { searchFlightsAction, addFlightToTrip } from "@/app/actions/deals";
import { formatMoney } from "@/lib/currencies";
import { track } from "@/lib/analytics";
import DestinationCombobox from "./DestinationCombobox";
import HomeAirportPrompt from "./HomeAirportPrompt";

type Props = {
  tripId: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  adults: number;
  currency: string;
  dealsConfigured: boolean;
  initialHomeAirport: string | null;
  onHover: (preview: number | null) => void;
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}

export default function FlightSearchPanel({
  tripId,
  destination,
  startDate,
  endDate,
  adults,
  currency,
  dealsConfigured,
  initialHomeAirport,
  onHover,
}: Props) {
  const router = useRouter();
  const [homeAirport, setHomeAirport] = useState(initialHomeAirport);
  const [origin, setOrigin] = useState(initialHomeAirport ?? "");
  const [destIata, setDestIata] = useState("");
  const [depart, setDepart] = useState(startDate ?? "");
  const [ret, setRet] = useState(endDate ?? "");
  const [results, setResults] = useState<FlightOffer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  async function handleSearch() {
    if (!origin || !destIata || !depart) {
      setError("Origin, destination and departure date are required");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    track("deal_searched", { type: "flight", origin, destination: destIata });
    const r = await searchFlightsAction({
      origin,
      destination: destIata,
      departureDate: depart,
      returnDate: ret || undefined,
      adults,
      currencyCode: currency,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setResults(r.data);
  }

  async function handleAdd(offer: FlightOffer) {
    setAddingId(offer.id);
    const r = await addFlightToTrip(tripId, offer, {
      origin,
      destination: destIata,
      departureDate: depart,
    });
    setAddingId(null);
    if (r.ok) {
      track("deal_added_to_trip", { type: "flight", price: offer.totalPrice });
    } else if (!r.ok) {
      alert(r.error);
      return;
    }
    onHover(null);
    router.refresh();
  }

  if (!dealsConfigured) {
    return <ConnectPrompt />;
  }

  return (
    <div className="space-y-4">
      <HomeAirportPrompt
        current={homeAirport}
        onSaved={(iata) => {
          setHomeAirport(iata);
          setOrigin(iata);
        }}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="From">
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="JFK"
            className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-mono uppercase shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </Field>
        <Field label="To">
          <DestinationCombobox
            type="airport"
            value={destIata}
            onChange={(iata) => setDestIata(iata)}
            placeholder={destination || "Tokyo"}
          />
          {/* destIata holds the IATA airport code */}
        </Field>
        <Field label="Depart">
          <input
            type="date"
            value={depart}
            onChange={(e) => setDepart(e.target.value)}
            className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </Field>
        <Field label="Return">
          <input
            type="date"
            value={ret}
            min={depart || undefined}
            onChange={(e) => setRet(e.target.value)}
            className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search flights"}
        </button>
        <span className="text-xs text-neutral-500">
          For {adults} traveler{adults === 1 ? "" : "s"}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {results && results.length === 0 && (
        <div className="rounded-md border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          No flights found for these dates.
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((offer) => (
            <div
              key={offer.id}
              onMouseEnter={() => onHover(offer.totalPrice)}
              onMouseLeave={() => onHover(null)}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                    {offer.airlineCodes.join("/")}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {offer.stops === 0 ? "Nonstop" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-2 text-sm">
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    {fmtTime(offer.outbound[0]?.departure.at ?? "")}
                  </span>
                  <span className="text-neutral-400">→</span>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    {fmtTime(offer.outbound[offer.outbound.length - 1]?.arrival.at ?? "")}
                  </span>
                  <span className="text-xs text-neutral-500">
                    · {fmtDuration(offer.totalDurationMinutes)}
                  </span>
                </div>
                {offer.returnSegments && offer.returnSegments.length > 0 && (
                  <div className="mt-1 text-xs text-neutral-500">
                    Return: {fmtTime(offer.returnSegments[0].departure.at)} →{" "}
                    {fmtTime(offer.returnSegments[offer.returnSegments.length - 1].arrival.at)}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold tabular-nums text-neutral-900">
                  {formatMoney(offer.totalPrice, offer.currency)}
                </div>
                {offer.perAdult && (
                  <div className="text-xs text-neutral-500">
                    {formatMoney(offer.perAdult, offer.currency)} pp
                  </div>
                )}
              </div>
              <button
                onClick={() => handleAdd(offer)}
                disabled={addingId !== null}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                {addingId === offer.id ? "Adding…" : "Add to trip"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function ConnectPrompt() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center">
      <h3 className="text-sm font-semibold text-neutral-900">Connect Duffel to search flights</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Get a free test token at{" "}
        <a
          href="https://duffel.com"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-neutral-700 underline hover:text-neutral-900"
        >
          duffel.com
        </a>
        , then add <code className="rounded bg-neutral-100 px-1 text-xs">DUFFEL_TOKEN</code> to{" "}
        <code className="rounded bg-neutral-100 px-1 text-xs">.env.local</code> and restart.
      </p>
    </div>
  );
}
