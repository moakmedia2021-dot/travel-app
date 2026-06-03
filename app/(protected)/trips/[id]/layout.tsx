import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TripHeader from "@/components/TripHeader";
import TripTabs from "@/components/TripTabs";
import WeatherStrip from "@/components/weather/WeatherStrip";
import TripPresenceProvider from "@/components/realtime/TripPresenceContext";
import PresenceStack from "@/components/realtime/PresenceStack";
import ItineraryRealtimeSync from "@/components/realtime/ItineraryRealtimeSync";
import ExpenseRealtimeSync from "@/components/realtime/ExpenseRealtimeSync";
import TripChat from "@/components/chat/TripChat";
import DownloadTripButton from "@/components/offline/DownloadTripButton";
import { listTripMessages } from "@/app/actions/chat";
import { geocode, getForecast } from "@/lib/weather";
import type { Trip } from "@/lib/types";

type MemberRow = {
  user_id: string;
  profile: { id: string; full_name: string | null; username: string | null; avatar_url: string | null } | { id: string; full_name: string | null; username: string | null; avatar_url: string | null }[] | null;
};

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [tripRes, memberRes, myProfileRes, initialMessages] = await Promise.all([
    supabase.from("trips").select("*").eq("id", id).single(),
    supabase
      .from("trip_members")
      .select(
        "user_id, profile:profiles!user_id(id, full_name, username, avatar_url)"
      )
      .eq("trip_id", id),
    user
      ? supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    listTripMessages(id, 100),
  ]);

  if (tripRes.error || !tripRes.data) notFound();
  const t = tripRes.data as Trip;

  // Member name + avatar lookups for chat & expense toasts
  const memberRows = (memberRes.data ?? []) as MemberRow[];
  const memberNames: Record<string, string> = {};
  const memberAvatars: Record<string, string | null> = {};
  for (const m of memberRows) {
    const p = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    if (!p) continue;
    memberNames[m.user_id] = p.full_name || p.username || "Someone";
    memberAvatars[m.user_id] = p.avatar_url ?? null;
  }

  const myProfile = myProfileRes.data as {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  const currentUser =
    user && myProfile
      ? {
          id: user.id,
          name: myProfile.full_name || myProfile.username || user.email || "You",
          avatar_url: myProfile.avatar_url,
        }
      : null;

  // Best-effort weather
  let forecast: Awaited<ReturnType<typeof getForecast>> = [];
  if (t.destination && t.start_date && t.end_date) {
    const geo = await geocode(t.destination);
    if (geo) {
      forecast = await getForecast({
        lat: geo.lat,
        lng: geo.lng,
        startDate: t.start_date,
        endDate: t.end_date,
        timezone: geo.timezone,
      });
    }
  }

  const isMember = !!currentUser && memberRows.some((m) => m.user_id === currentUser.id);

  const content = (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <TripHeader trip={t} compact />
        {isMember && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3">
            <PresenceStack />
            <DownloadTripButton tripId={id} />
          </div>
        )}
        {forecast.length > 0 && <WeatherStrip forecast={forecast} />}
      </div>
      <TripTabs tripId={id} />
      <div>{children}</div>
    </div>
  );

  // Wrap with realtime only when the viewer is a member.
  if (!currentUser || !isMember) return content;

  return (
    <TripPresenceProvider tripId={id} currentUser={currentUser}>
      {content}
      <ItineraryRealtimeSync tripId={id} currentUserId={currentUser.id} />
      <ExpenseRealtimeSync
        tripId={id}
        currentUserId={currentUser.id}
        memberNames={memberNames}
      />
      <TripChat
        tripId={id}
        currentUserId={currentUser.id}
        memberNames={memberNames}
        memberAvatars={memberAvatars}
        initialMessages={initialMessages}
      />
    </TripPresenceProvider>
  );
}
