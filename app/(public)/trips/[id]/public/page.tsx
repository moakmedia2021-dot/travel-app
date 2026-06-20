import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PublicTripView from "@/components/public/PublicTripView";
import CopyTripButton from "@/components/public/CopyTripButton";
import JoinCTA from "@/components/public/JoinCTA";
import type { ItineraryItem, Trip } from "@/lib/types";
import { formatDateRange } from "@/lib/format";

export const revalidate = 300;

type Params = { id: string };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://getgoin.app").replace(/\/$/, "");
}

async function loadTrip(id: string) {
  const supabase = await createClient();
  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .eq("visibility", "public")
    .maybeSingle();
  return trip as Trip | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const trip = await loadTrip(id);
  if (!trip) return { title: "Trip not found" };

  const supabase = await createClient();
  const { count } = await supabase
    .from("itinerary_items")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", id);

  const dest = trip.destination || trip.title;
  const dateStr = formatDateRange(trip.start_date, trip.end_date);
  const description =
    `${dateStr}${count ? ` · ${count} planned item${count === 1 ? "" : "s"}` : ""}` +
    `. View this travel itinerary and copy it to plan your own trip.`;
  const url = `${siteUrl()}/trips/${id}/public`;

  return {
    title: `Trip to ${dest}`,
    description,
    openGraph: {
      title: `Trip to ${dest}`,
      description,
      url,
      type: "article",
      images: trip.cover_image_url ? [{ url: trip.cover_image_url }] : [],
    },
    twitter: {
      card: trip.cover_image_url ? "summary_large_image" : "summary",
      title: `Trip to ${dest}`,
      description,
      images: trip.cover_image_url ? [trip.cover_image_url] : [],
    },
    alternates: { canonical: url },
  };
}

type MemberRow = {
  user_id: string;
  role: string;
};

type OwnerProfile = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default async function PublicTripPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const trip = await loadTrip(id);
  if (!trip) notFound();

  const supabase = await createClient();
  const [itemsRes, membersRes, ownerRes, userRes] = await Promise.all([
    supabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", id)
      .order("day_number", { ascending: true })
      .order("position", { ascending: true }),
    supabase
      .from("trip_members")
      .select("user_id, role")
      .eq("trip_id", id),
    supabase
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", trip.owner_id)
      .single(),
    supabase.auth.getUser(),
  ]);

  const items = (itemsRes.data ?? []) as ItineraryItem[];
  const memberCount = (membersRes.data ?? []).length || 1;
  const owner = (ownerRes.data ?? {}) as OwnerProfile;
  const ownerName = owner.full_name || owner.username || "A traveler";
  const isAuthenticated = !!userRes.data.user;

  const url = `${siteUrl()}/trips/${id}/public`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: trip.title,
    description: `Itinerary for ${trip.destination ?? trip.title}`,
    url,
    image: trip.cover_image_url || undefined,
    touristType: "Leisure",
    itinerary:
      items.length > 0
        ? {
            "@type": "ItemList",
            numberOfItems: items.length,
            itemListElement: items.slice(0, 20).map((item, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              name: item.title,
              ...(item.location_name ? { description: item.location_name } : {}),
            })),
          }
        : undefined,
    ...(trip.start_date ? { startDate: trip.start_date } : {}),
    ...(trip.end_date ? { endDate: trip.end_date } : {}),
    provider: { "@type": "Person", name: ownerName },
  };

  // Trip-related members rendered alongside the owner credit (count only)
  void (membersRes.data as MemberRow[] | null);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">Read-only itinerary</p>
        <CopyTripButton tripId={id} isAuthenticated={isAuthenticated} />
      </div>
      <PublicTripView
        trip={trip}
        ownerName={ownerName}
        ownerUsername={owner.username}
        ownerAvatar={owner.avatar_url}
        memberCount={memberCount}
        items={items}
      />
      {!isAuthenticated && <JoinCTA message="Like what you see? Copy this trip and customize it." />}
    </>
  );
}
