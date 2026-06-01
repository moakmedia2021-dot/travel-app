"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TripInvite, TripMember } from "@/lib/types";
import { useTripPresence } from "@/components/realtime/TripPresenceContext";
import MemberRow from "./MemberRow";
import PendingInviteRow from "./PendingInviteRow";
import InviteModal from "./InviteModal";

type Props = {
  tripId: string;
  currentUserId: string;
  isOwner: boolean;
  initialMembers: TripMember[];
  initialInvites: TripInvite[];
};

export default function MembersView({
  tripId,
  currentUserId,
  isOwner,
  initialMembers,
  initialInvites,
}: Props) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);

  // Reuse the single presence channel maintained by TripPresenceProvider in the
  // trip layout. Opening a second channel with the same topic here collided
  // with it and broke realtime/presence — so we derive the online members from
  // the shared context instead.
  const presence = useTripPresence();
  const presentIds = useMemo(
    () => new Set((presence?.presentUsers ?? []).map((u) => u.user_id)),
    [presence]
  );

  const sortedMembers = useMemo(() => {
    const rank = { owner: 0, editor: 1, viewer: 2 } as const;
    return [...initialMembers].sort((a, b) => rank[a.role] - rank[b.role]);
  }, [initialMembers]);

  const pending = initialInvites.filter((i) => i.status === "pending");

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Members
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            {sortedMembers.length} member{sortedMembers.length === 1 ? "" : "s"}
            {presentIds.size > 1 && (
              <span className="ml-2 text-green-600">
                · {presentIds.size} online now
              </span>
            )}
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Invite people
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sortedMembers.map((m) => (
          <MemberRow
            key={m.user_id}
            tripId={tripId}
            member={m}
            isCurrentUser={m.user_id === currentUserId}
            canManage={isOwner}
            isPresent={presentIds.has(m.user_id) && m.user_id !== currentUserId}
            onChange={refresh}
          />
        ))}
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Pending invites
          </h3>
          {pending.map((inv) => (
            <PendingInviteRow
              key={inv.id}
              tripId={tripId}
              invite={inv}
              canManage={isOwner}
              onChange={refresh}
            />
          ))}
        </div>
      )}

      <InviteModal
        tripId={tripId}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={refresh}
      />
    </div>
  );
}
