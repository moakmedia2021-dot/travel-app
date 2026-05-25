"use client";

import { useState } from "react";
import type { TripMember } from "@/lib/types";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import { updateMemberRole, removeMember } from "@/app/actions/members";

type Props = {
  tripId: string;
  member: TripMember;
  isCurrentUser: boolean;
  canManage: boolean;
  isPresent: boolean;
  onChange: () => void;
};

const roleStyles: Record<TripMember["role"], string> = {
  owner: "bg-amber-100 text-amber-800",
  editor: "bg-blue-100 text-blue-800",
  viewer: "bg-neutral-100 text-neutral-700",
};

export default function MemberRow({
  tripId,
  member,
  isCurrentUser,
  canManage,
  isPresent,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function setRole(role: "editor" | "viewer") {
    setBusy(true);
    setOpen(false);
    await updateMemberRole(tripId, member.user_id, role);
    setBusy(false);
    onChange();
  }

  async function remove() {
    if (!confirm(`Remove ${memberDisplayName(member.profile)} from this trip?`)) return;
    setBusy(true);
    setOpen(false);
    await removeMember(tripId, member.user_id);
    setBusy(false);
    onChange();
  }

  const showMenu = canManage && member.role !== "owner";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <div className="relative shrink-0">
        <MemberAvatar profile={member.profile} size={36} />
        {isPresent && (
          <span
            className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500"
            title="Online now"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-neutral-900">
            {memberDisplayName(member.profile)}
          </span>
          {isCurrentUser && <span className="text-xs text-neutral-400">(you)</span>}
        </div>
        <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${roleStyles[member.role]}`}>
          {member.role}
        </span>
      </div>

      {showMenu && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            disabled={busy}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
            aria-label="More actions"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                {member.role !== "editor" && (
                  <button onClick={() => setRole("editor")} className="block w-full px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-50">
                    Make editor
                  </button>
                )}
                {member.role !== "viewer" && (
                  <button onClick={() => setRole("viewer")} className="block w-full px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-50">
                    Make viewer
                  </button>
                )}
                <div className="my-1 border-t border-neutral-100" />
                <button onClick={remove} className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50">
                  Remove from trip
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
