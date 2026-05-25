"use client";

import { useState } from "react";
import FlightSearchPanel from "./FlightSearchPanel";
import HotelSearchPanel from "./HotelSearchPanel";
import ActivitiesPanel from "./ActivitiesPanel";
import BudgetBar from "./BudgetBar";

type Props = {
  tripId: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  adults: number;
  currency: string;
  budget: number | null;
  spent: number;
  maxDay: number;
  dealsConfigured: boolean;
  homeAirport: string | null;
};

type Tab = "flights" | "hotels" | "activities";

export default function DealsView(props: Props) {
  const [tab, setTab] = useState<Tab>("flights");
  const [hoverPreview, setHoverPreview] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Find deals
        </h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          Search flights, hotels, and activities — add what looks good to your trip.
        </p>
      </div>

      <div className="flex gap-1 rounded-md bg-neutral-100 p-1 text-sm">
        {(["flights", "hotels", "activities"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded px-3 py-1.5 font-medium capitalize transition-colors ${
              tab === t
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        {tab === "flights" && (
          <FlightSearchPanel
            tripId={props.tripId}
            destination={props.destination}
            startDate={props.startDate}
            endDate={props.endDate}
            adults={props.adults}
            currency={props.currency}
            dealsConfigured={props.dealsConfigured}
            initialHomeAirport={props.homeAirport}
            onHover={setHoverPreview}
          />
        )}
        {tab === "hotels" && (
          <HotelSearchPanel
            tripId={props.tripId}
            destination={props.destination}
            startDate={props.startDate}
            endDate={props.endDate}
            adults={props.adults}
            currency={props.currency}
            dealsConfigured={props.dealsConfigured}
            onHover={setHoverPreview}
          />
        )}
        {tab === "activities" && (
          <ActivitiesPanel
            tripId={props.tripId}
            destination={props.destination}
            maxDay={props.maxDay}
            onHover={setHoverPreview}
          />
        )}
      </div>

      <BudgetBar
        spent={props.spent}
        budget={props.budget}
        currency={props.currency}
        pendingPreview={hoverPreview}
      />
    </div>
  );
}
