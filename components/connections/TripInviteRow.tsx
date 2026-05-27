"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MemberAvatar } from "@/components/budget/MemberAvatar";
import { acceptInviteById, declineInviteById, type MyPendingInvite } from "@/app/actions/invites";
import { formatDateRange } from "@/lib/format";

export default function TripInviteRow({ invite }: { invite: MyPendingInvite }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setBusy("accept");
    setError(null);
    const r = await acceptInviteById(invite.invite_id);
    setBusy(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push(`/trips/${r.data}`);
    router.refresh();
  }

  async function handleDecline() {
    setBusy("decline");
    setError(null);
    const r = await declineInviteById(invite.invite_id);
    setBusy(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  const inviterProfile = {
    id: "",
    full_name: invite.inviter_name,
    username: invite.inviter_username,
    avatar_url: invite.inviter_avatar_url,
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <MemberAvatar profile={inviterProfile} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-neutral-700">
            <Link
              href={invite.inviter_username ? `/profile/${invite.inviter_username}` : "#"}
              className="font-semibold text-neutral-900 hover:underline"
            >
              {invite.inviter_name}
            </Link>{" "}
            invited you to
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold text-neutral-900">
            {invite.trip_title}
          </div>
          <div className="text-xs text-neutral-500">
            {invite.trip_destination && <>{invite.trip_destination} · </>}
            {formatDateRange(invite.trip_start_date, invite.trip_end_date)}
            {" · "}as <span className="capitalize">{invite.role}</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={handleDecline}
          disabled={busy !== null}
          className="h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {busy === "decline" ? "…" : "Decline"}
        </button>
        <button
          onClick={handleAccept}
          disabled={busy !== null}
          className="h-11 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {busy === "accept" ? "Joining…" : "Accept"}
        </button>
      </div>
    </div>
  );
}
