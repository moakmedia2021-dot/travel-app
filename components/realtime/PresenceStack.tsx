"use client";

import { useTripPresence } from "./TripPresenceContext";
import { MemberAvatar } from "@/components/budget/MemberAvatar";
import { ringForUser } from "@/lib/realtime/presenceColors";

type Props = { max?: number };

export default function PresenceStack({ max = 5 }: Props) {
  const presence = useTripPresence();

  if (!presence || presence.presentUsers.length === 0) return null;

  const { presentUsers, currentUserId } = presence;

  // Sort: current user first, then by name
  const sorted = [...presentUsers].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    return a.name.localeCompare(b.name);
  });

  const shown = sorted.slice(0, max);
  const overflow = sorted.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((u) => {
          const ring = ringForUser(u.user_id);
          const tooltip =
            u.focus?.kind === "day"
              ? `${u.name} is editing Day ${u.focus.day_number}`
              : u.user_id === currentUserId
                ? "You"
                : `${u.name} is viewing`;
          return (
            <div
              key={u.user_id}
              className={`relative rounded-full ring-2 ring-offset-2 ring-offset-white ${ring}`}
              title={tooltip}
            >
              <MemberAvatar
                profile={{
                  id: u.user_id,
                  username: null,
                  full_name: u.name,
                  avatar_url: u.avatar_url,
                }}
                size={28}
              />
            </div>
          );
        })}
        {overflow > 0 && (
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-[10px] font-semibold text-neutral-700">
            +{overflow}
          </div>
        )}
      </div>
      <span className="ml-3 hidden text-xs text-neutral-500 sm:inline">
        {presentUsers.length === 1
          ? "Just you"
          : `${presentUsers.length} viewing now`}
      </span>
    </div>
  );
}
