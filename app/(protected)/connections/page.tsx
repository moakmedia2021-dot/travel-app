import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConnectionsView from "@/components/connections/ConnectionsView";
import { listMyPendingInvites } from "@/app/actions/invites";
import type { Profile, SocialConnection } from "@/lib/types";

type ConnectionRow = SocialConnection & {
  requester: Profile | Profile[] | null;
  addressee: Profile | Profile[] | null;
};

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data }, tripInvites] = await Promise.all([
    supabase
      .from("social_connections")
      .select(
        "*, requester:profiles!requester_id(id, username, full_name, avatar_url), addressee:profiles!addressee_id(id, username, full_name, avatar_url)"
      )
      .order("created_at", { ascending: false }),
    listMyPendingInvites(),
  ]);

  const rows = (data ?? []) as ConnectionRow[];

  function unwrap(p: Profile | Profile[] | null): Profile {
    if (Array.isArray(p)) return p[0];
    return p as Profile;
  }

  const enriched = rows.map((row) => {
    const iAmRequester = row.requester_id === user.id;
    const other = unwrap(iAmRequester ? row.addressee : row.requester);
    return {
      id: row.id,
      status: row.status,
      message: row.message,
      created_at: row.created_at,
      other,
      iAmRequester,
    };
  });

  const incoming = enriched.filter((r) => r.status === "pending" && !r.iAmRequester);
  const outgoing = enriched.filter((r) => r.status === "pending" && r.iAmRequester);
  const accepted = enriched.filter((r) => r.status === "accepted");

  return (
    <ConnectionsView
      incoming={incoming}
      outgoing={outgoing}
      accepted={accepted}
      tripInvites={tripInvites}
    />
  );
}
