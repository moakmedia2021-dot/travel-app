import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PublicProfile from "@/components/profile/PublicProfile";
import JoinCTA from "@/components/public/JoinCTA";
import type { Profile, Trip, TripPost } from "@/lib/types";

export const revalidate = 300;

type Params = { username: string };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://travel-app-xfgp.vercel.app").replace(/\/$/, "");
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, bio, avatar_url, home_city")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return { title: "Profile not found" };

  const name = profile.full_name || profile.username || "Traveler";
  const description = profile.bio
    ? truncate(profile.bio, 160)
    : `${name}${profile.home_city ? ` · ${profile.home_city}` : ""} on GetGoin`;
  const url = `${siteUrl()}/profile/${username}`;

  return {
    title: `${name} — Travel Profile`,
    description,
    openGraph: {
      title: `${name} on GetGoin`,
      description,
      url,
      type: "profile",
      images: profile.avatar_url ? [{ url: profile.avatar_url, width: 512, height: 512 }] : [],
    },
    twitter: {
      card: profile.avatar_url ? "summary_large_image" : "summary",
      title: `${name} on GetGoin`,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
    alternates: { canonical: url },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, home_city, travel_tags, countries_visited, instagram_handle")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();
  const target = profile as Profile;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const isMe = isAuthenticated && target.id === user!.id;

  const visibilityFilter = isMe ? ["private", "group", "public"] : ["public", "group"];

  const [tripsRes, postsRes, followersRes, followingRes, connRes, myFollowsRes, myTripsRes] =
    await Promise.all([
      supabase
        .from("trips")
        .select("*")
        .eq("owner_id", target.id)
        .in("visibility", visibilityFilter)
        .order("start_date", { ascending: false }),
      supabase
        .from("trip_posts")
        .select("*")
        .eq("user_id", target.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("social_follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", target.id),
      supabase
        .from("social_follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", target.id),
      isAuthenticated && !isMe
        ? supabase
            .from("social_connections")
            .select("*")
            .or(
              `and(requester_id.eq.${user!.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user!.id})`
            )
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      isAuthenticated && !isMe
        ? supabase
            .from("social_follows")
            .select("follower_id")
            .eq("following_id", target.id)
            .eq("follower_id", user!.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      isAuthenticated && !isMe
        ? supabase
            .from("trips")
            .select("id, title")
            .eq("owner_id", user!.id)
            .in("status", ["draft", "planned", "active"])
            .order("start_date", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

  const trips = (tripsRes.data ?? []) as Trip[];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips.filter((t) => !t.end_date || t.end_date >= today);
  const past = trips.filter((t) => t.end_date && t.end_date < today);

  const url = `${siteUrl()}/profile/${username}`;
  const displayName = target.full_name || target.username || "Traveler";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    alternateName: target.username ? `@${target.username}` : undefined,
    description: target.bio || undefined,
    image: target.avatar_url || undefined,
    homeLocation: target.home_city ? { "@type": "Place", name: target.home_city } : undefined,
    url,
    sameAs: target.instagram_handle
      ? [`https://instagram.com/${target.instagram_handle}`]
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PublicProfile
        profile={target}
        isMe={isMe}
        isAuthenticated={isAuthenticated}
        currentUserId={user?.id ?? null}
        upcomingTrips={upcoming}
        pastTrips={past}
        posts={(postsRes.data ?? []) as TripPost[]}
        followers={followersRes.count ?? 0}
        following={followingRes.count ?? 0}
        isFollowing={!!myFollowsRes.data}
        connection={
          (connRes.data as { id: string; status: string; requester_id: string; addressee_id: string } | null) ??
          null
        }
        myActiveTrips={(myTripsRes.data ?? []) as { id: string; title: string }[]}
      />
      {!isAuthenticated && <JoinCTA name={displayName} />}
    </>
  );
}
