import type { ItineraryItem, Trip } from "@/lib/types";

export type OfflineMember = {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  name: string;
  username: string | null;
};

// Everything needed to view a trip's info + itinerary with no network.
export type TripBundle = {
  trip: Trip;
  items: ItineraryItem[];
  members: OfflineMember[];
  saved_at: string; // ISO timestamp of when it was downloaded
};
