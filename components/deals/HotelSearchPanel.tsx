"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HotelOffer } from "@/lib/duffel";
import { searchHotelsAction, addHotelToTrip } from "@/app/actions/deals";
import { formatMoney } from "@/lib/currencies";
import DestinationCombobox from "./DestinationCombobox";

type Props = {
  tripId: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  adults: number;
  currency: string;
  dealsConfigured: boolean;
  onHover: (preview: number | null) => void;
};

export default function HotelSearchPanel({
  tripId,
  destination,
  startDate,
  endDate,
  adults,
  currency,
  dealsConfigured,
  onHover,
}: Props) {
  const router = useRouter();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsLabel, setCoordsLabel] = useState("");
  const [checkIn, setCheckIn] = useState(startDate ?? "");
  const [checkOut, setCheckOut] = useState(endDate ?? "");
  const [results, setResults] = useState<HotelOffer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  async function handleSearch() {
    if (!coords || !checkIn || !checkOut) {
      setError("Pick a city, check-in, and check-out date");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    const r = await searchHotelsAction({
      latitude: coords.lat,
      longitude: coords.lng,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      cityLabel: coordsLabel,
      currency,
    });
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setResults(r.data);
  }

  async function handleAdd(offer: HotelOffer) {
    setAddingId(offer.hotelId);
    const r = await addHotelToTrip(tripId, offer, {
      checkInDate: checkIn,
      checkOutDate: checkOut,
    });
    setAddingId(null);
    if (!r.ok) {
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
      <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Showing sample hotels. Duffel Stays requires sales approval — request it at{" "}
        <a href="https://duffel.com/contact-us" target="_blank" rel="noreferrer" className="underline">
          duffel.com/contact-us
        </a>{" "}
        to use real listings.
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="City">
          <DestinationCombobox
            type="city"
            value={coordsLabel}
            onChange={(_iata, label, place) => {
              if (place.latitude != null && place.longitude != null) {
                setCoords({ lat: place.latitude, lng: place.longitude });
                setCoordsLabel(label);
              }
            }}
            placeholder={destination || "Paris"}
          />
        </Field>
        <Field label="Check in">
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </Field>
        <Field label="Check out">
          <input
            type="date"
            value={checkOut}
            min={checkIn || undefined}
            onChange={(e) => setCheckOut(e.target.value)}
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
          {loading ? "Searching…" : "Search hotels"}
        </button>
        <span className="text-xs text-neutral-500">
          For {adults} guest{adults === 1 ? "" : "s"}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {results && results.length === 0 && (
        <div className="rounded-md border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          No hotels found for these dates.
        </div>
      )}

      {results && results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((offer) => (
            <div
              key={offer.hotelId}
              onMouseEnter={() => onHover(offer.totalPrice)}
              onMouseLeave={() => onHover(null)}
              className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate text-sm font-semibold text-neutral-900">{offer.name}</h3>
                {offer.rating && (
                  <span className="shrink-0 text-xs text-amber-600">
                    {"★".repeat(Math.round(offer.rating))}
                  </span>
                )}
              </div>
              {offer.distanceKm != null && (
                <div className="mt-0.5 text-xs text-neutral-500">
                  {offer.distanceKm.toFixed(1)} km from center
                </div>
              )}
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <div className="text-base font-semibold tabular-nums text-neutral-900">
                    {formatMoney(offer.perNight, offer.currency)}
                    <span className="ml-1 text-xs font-normal text-neutral-500">/ night</span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {formatMoney(offer.totalPrice, offer.currency)} for {offer.nights} nights
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(offer)}
                  disabled={addingId !== null}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {addingId === offer.hotelId ? "Adding…" : "Add to trip"}
                </button>
              </div>
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
      <h3 className="text-sm font-semibold text-neutral-900">Connect Duffel to search hotels</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Uses the same credentials as flights. See the Flights tab for setup.
      </p>
    </div>
  );
}
