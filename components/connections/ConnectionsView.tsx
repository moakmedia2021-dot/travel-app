"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import { respondConnection, cancelConnection, removeConnection } from "@/app/actions/social";
import type { Profile } from "@/lib/types";
import type { MyPendingInvite } from "@/app/actions/invites";
import TripInviteRow from "./TripInviteRow";

type Row = {
  id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  message: string | null;
  created_at: string;
  other: Profile;
  iAmRequester: boolean;
};

type Props = {
  incoming: Row[];
  outgoing: Row[];
  accepted: Row[];
  tripInvites: MyPendingInvite[];
};

export default function ConnectionsView({ incoming, outgoing, accepted, tripInvites }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAccept(id: string) {
    setBusyId(id);
    await respondConnection(id, true);
    setBusyId(null);
    router.refresh();
  }

  async function handleDecline(id: string) {
    setBusyId(id);
    await respondConnection(id, false);
    setBusyId(null);
    router.refresh();
  }

  async function handleCancel(id: string) {
    setBusyId(id);
    await cancelConnection(id);
    setBusyId(null);
    router.refresh();
  }

  async function handleRemove(otherId: string) {
    if (!confirm("Remove this connection?")) return;
    setBusyId(otherId);
    await removeConnection(otherId);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Connections</h1>

      {tripInvites.length > 0 && (
        <Section title={`Trip invites · ${tripInvites.length}`}>
          {tripInvites.map((inv) => (
            <TripInviteRow key={inv.invite_id} invite={inv} />
          ))}
        </Section>
      )}

      {incoming.length > 0 && (
        <Section title={`Incoming requests · ${incoming.length}`}>
          {incoming.map((row) => (
            <div key={row.id} className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3">
              <MemberAvatar profile={row.other} size={40} />
              <div className="min-w-0 flex-1">
                <ProfileLink profile={row.other} />
                {row.message && (
                  <p className="mt-1 rounded-md bg-neutral-50 px-2 py-1 text-xs text-neutral-700">{row.message}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => handleDecline(row.id)}
                  disabled={busyId === row.id}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(row.id)}
                  disabled={busyId === row.id}
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
        </Section>
      )}

      {outgoing.length > 0 && (
        <Section title={`Outgoing requests · ${outgoing.length}`}>
          {outgoing.map((row) => (
            <div key={row.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
              <MemberAvatar profile={row.other} size={40} />
              <div className="min-w-0 flex-1">
                <ProfileLink profile={row.other} />
                <p className="text-xs text-neutral-400">Pending</p>
              </div>
              <button
                onClick={() => handleCancel(row.id)}
                disabled={busyId === row.id}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ))}
        </Section>
      )}

      <Section title={`Connections · ${accepted.length}`}>
        {accepted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            No connections yet. Head to <Link href="/discover" className="font-medium text-neutral-700 underline">Discover</Link> to find travelers.
          </p>
        ) : (
          accepted.map((row) => (
            <div key={row.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
              <MemberAvatar profile={row.other} size={40} />
              <div className="min-w-0 flex-1">
                <ProfileLink profile={row.other} />
              </div>
              <button
                onClick={() => handleRemove(row.other.id)}
                disabled={busyId === row.other.id}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ProfileLink({ profile }: { profile: Profile }) {
  const name = memberDisplayName(profile);
  if (profile.username) {
    return (
      <Link href={`/profile/${profile.username}`} className="block truncate text-sm font-medium text-neutral-900 hover:underline">
        {name}
      </Link>
    );
  }
  return <span className="block truncate text-sm font-medium text-neutral-900">{name}</span>;
}
