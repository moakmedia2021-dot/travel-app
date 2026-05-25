export type Activity = {
  id: string;
  title: string;
  description: string;
  durationHours: number;
  price: number;
  currency: string;
  rating: number;
  imageHue: number; // for placeholder gradient
};

const ACTIVITIES: Activity[] = [
  {
    id: "a1",
    title: "Half-Day Walking Food Tour",
    description: "Wander through hidden neighborhoods and taste 7 local specialties with a chef-guide.",
    durationHours: 4,
    price: 89,
    currency: "USD",
    rating: 4.8,
    imageHue: 25,
  },
  {
    id: "a2",
    title: "Sunset Sailing Trip",
    description: "2-hour catamaran cruise with drinks, snacks, and a chance to swim in coves.",
    durationHours: 2,
    price: 65,
    currency: "USD",
    rating: 4.7,
    imageHue: 200,
  },
  {
    id: "a3",
    title: "Old Town History Walk",
    description: "Small-group walking tour with a licensed local guide through the historic quarter.",
    durationHours: 3,
    price: 35,
    currency: "USD",
    rating: 4.6,
    imageHue: 45,
  },
  {
    id: "a4",
    title: "Hands-On Cooking Class",
    description: "Learn 3 traditional dishes in a local kitchen, then sit down to eat what you made.",
    durationHours: 3.5,
    price: 75,
    currency: "USD",
    rating: 4.9,
    imageHue: 15,
  },
  {
    id: "a5",
    title: "Day Trip to the Countryside",
    description: "Air-conditioned coach to nearby villages and vineyards with included lunch.",
    durationHours: 8,
    price: 120,
    currency: "USD",
    rating: 4.5,
    imageHue: 130,
  },
  {
    id: "a6",
    title: "Museum Skip-the-Line Pass",
    description: "Priority entry to the city's three most-visited museums, valid for two days.",
    durationHours: 1,
    price: 45,
    currency: "USD",
    rating: 4.4,
    imageHue: 280,
  },
];

export function searchActivities(destination: string): Activity[] {
  // Trivial filter just so the destination param does something visible.
  // Always return all 6; later swap for Viator API.
  void destination;
  return ACTIVITIES;
}
