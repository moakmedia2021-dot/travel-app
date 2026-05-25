import type { HotelOffer } from "./duffel";

const TEMPLATES: Array<Omit<HotelOffer, "nights" | "perNight" | "totalPrice" | "currency" | "cityCode">> = [
  { hotelId: "h1", name: "The Grand Plaza", rating: 5, distanceKm: 0.4 },
  { hotelId: "h2", name: "Boutique Riverside", rating: 4, distanceKm: 1.2 },
  { hotelId: "h3", name: "Old Town Lodge", rating: 3, distanceKm: 0.7 },
  { hotelId: "h4", name: "Skyline View Hotel", rating: 4, distanceKm: 2.1 },
  { hotelId: "h5", name: "Cozy Garden Inn", rating: 3, distanceKm: 3.4 },
  { hotelId: "h6", name: "Modern Loft Suites", rating: 4, distanceKm: 1.8 },
  { hotelId: "h7", name: "Hillside Resort & Spa", rating: 5, distanceKm: 5.5 },
  { hotelId: "h8", name: "Budget Stay Central", rating: 2, distanceKm: 0.9 },
];

function nightsBetween(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function searchMockHotels(args: {
  city: string;
  checkInDate: string;
  checkOutDate: string;
  currency: string;
}): HotelOffer[] {
  const nights = nightsBetween(args.checkInDate, args.checkOutDate);
  const cityLabel = args.city.trim() || "Downtown";

  return TEMPLATES.map((t, i) => {
    // Pseudo-deterministic per-night price based on rating + index
    const perNight = 75 + (t.rating ?? 3) * 60 + i * 8;
    const total = Math.round(perNight * nights);
    return {
      ...t,
      cityCode: cityLabel,
      perNight,
      totalPrice: total,
      currency: args.currency,
      nights,
    };
  }).sort((a, b) => a.totalPrice - b.totalPrice);
}
