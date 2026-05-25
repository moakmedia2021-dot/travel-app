import { createClient } from "@/lib/supabase/server";
import MembersView from "@/components/members/MembersView";
import type { TripInvite, TripMember } from "@/lib/types";

type MemberRow = {
  user_id: string;
  role: TripMember["role"];
  joined_at: string;
  profile: TripMember["profile"] | TripMember["profile"][] | null;
};

export default async function MembersTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [membersRes, invitesRes] = await Promise.all([
    supabase
      .from("trip_members")
      .select("user_id, role, joined_at, profile:profiles!user_id(id, username, full_name, avatar_url)")
      .eq("trip_id", id),
    supabase
      .from("trip_invites")
      .select("*")
      .eq("trip_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const members: TripMember[] = ((membersRes.data ?? []) as MemberRow[]).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    profile: Array.isArray(m.profile) ? m.profile[0] : m.profile!,
  }));
  const invites = (invitesRes.data ?? []) as TripInvite[];

  const isOwner = members.some((m) => m.user_id === user?.id && m.role === "owner");

  return (
    <MembersView
      tripId={id}
      currentUserId={user?.id ?? ""}
      isOwner={isOwner}
      initialMembers={members}
      initialInvites={invites}
    />
  );
}
