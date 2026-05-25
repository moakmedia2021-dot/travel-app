import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicProfile from "@/components/profile/PublicProfile";
import type { Profile, Trip, TripPost } from "@/lib/types";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Public profiles still require auth for now (consistent with existing app).
    redirect(`/login?next=/profile/${encodeURIComponent(username)}`);
  }

  // Look up the profile being viewed
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, home_city, travel_tags, countries_visited, instagram_handle")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();
  const target = profile as Profile;
  const isMe = target.id === user.id;

  // Fetch their public + group trips (we can't see private trips of others)
  const tripFilter = isMe
    ? supabase.from("trips").select("*").eq("owner_id", target.id)
    : supabase
        .from("trips")
        .select("*")
        .eq("owner_id", target.id)
        .in("visibility", ["public", "group"]);

  const [tripsRes, postsRes, followersRes, followingRes, connRes, myFollowsRes, myTripsRes] =
    await Promise.all([
      tripFilter.order("start_date", { ascending: false }),
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
      isMe
        ? Promise.resolve({ data: null })
        : supabase
            .from("social_connections")
            .select("*")
            .or(
              `and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`
            )
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
      isMe
        ? Promise.resolve({ data: null })
        : supabase
            .from("social_follows")
            .select("follower_id")
            .eq("following_id", target.id)
            .eq("follower_id", user.id)
            .maybeSingle(),
      isMe
        ? Promise.resolve({ data: [] })
        : supabase
            .from("trips")
            .select("id, title")
            .eq("owner_id", user.id)
            .in("status", ["draft", "planned", "active"])
            .order("start_date", { ascending: true }),
    ]);

  const trips = (tripsRes.data ?? []) as Trip[];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips.filter((t) => !t.end_date || t.end_date >= today);
  const past = trips.filter((t) => t.end_date && t.end_date < today);

  return (
    <PublicProfile
      profile={target}
      isMe={isMe}
      currentUserId={user.id}
      upcomingTrips={upcoming}
      pastTrips={past}
      posts={(postsRes.data ?? []) as TripPost[]}
      followers={followersRes.count ?? 0}
      following={followingRes.count ?? 0}
      isFollowing={!!myFollowsRes.data}
      connection={(connRes.data as { id: string; status: string; requester_id: string; addressee_id: string } | null) ?? null}
      myActiveTrips={(myTripsRes.data ?? []) as { id: string; title: string }[]}
    />
  );
}
