"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import {
  listInvitableConnections,
  inviteConnectionToTrip,
  type InvitableConnection,
} from "@/app/actions/invites";
import SheetHandle from "@/components/ui/SheetHandle";

type Props = {
  tripId: string;
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
};

export default function InviteModal({ tripId, open, onClose, onInvited }: Props) {
  const [connections, setConnections] = useState<InvitableConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InvitableConnection | null>(null);
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setRole("editor");
      setError(null);
      setInviteLink(null);
      setCopied(false);
      return;
    }
    setLoading(true);
    listInvitableConnections(tripId).then((rows) => {
      setConnections(rows);
      setLoading(false);
    });
  }, [open, tripId]);

  async function handleSend() {
    if (!selected) return;
    setSending(true);
    setError(null);
    const r = await inviteConnectionToTrip(tripId, selected.user_id, role);
    setSending(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setInviteLink(r.data.url);
    onInvited();
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/40 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[100dvh] w-full max-w-md flex-col rounded-t-2xl sm:max-h-[85vh] sm:rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHandle />

        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">Invite people</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-neutral-400 hover:text-neutral-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {inviteLink ? (
            <div className="space-y-3">
              <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Invite sent. They'll see it under <Link href="/connections" className="underline font-medium">Connections</Link>.
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-700"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopy}
                  className="h-11 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => {
                  setInviteLink(null);
                  setSelected(null);
                }}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Invite someone else →
              </button>
            </div>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-neutral-400">Loading your connections…</p>
          ) : connections.length === 0 ? (
            <EmptyConnections />
          ) : (
            <>
              <p className="mb-3 text-xs text-neutral-500">
                Invite from your accepted connections. To invite someone new, send them a
                connection request first.
              </p>
              <div className="space-y-1 rounded-lg border border-neutral-200">
                {connections.map((c) => {
                  const profile = {
                    id: c.user_id,
                    full_name: c.full_name,
                    username: c.username,
                    avatar_url: c.avatar_url,
                  };
                  const active = selected?.user_id === c.user_id;
                  return (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-neutral-100" : "hover:bg-neutral-50"
                      } first:rounded-t-lg last:rounded-b-lg`}
                    >
                      <MemberAvatar profile={profile} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-neutral-900">
                          {memberDisplayName(profile)}
                        </div>
                        {c.username && (
                          <div className="truncate text-xs text-neutral-500">@{c.username}</div>
                        )}
                      </div>
                      {active && (
                        <svg className="h-5 w-5 text-neutral-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-neutral-700">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["editor", "viewer"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`rounded-md border px-3 py-2.5 text-sm transition-colors ${
                          role === r
                            ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                            : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                        }`}
                      >
                        <div className="font-medium capitalize">{r}</div>
                        <div className="text-xs text-neutral-500">
                          {r === "editor" ? "Can edit trip" : "Can view only"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
            </>
          )}
        </div>

        {!inviteLink && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
            <button
              onClick={onClose}
              className="h-11 rounded-md px-3 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!selected || sending}
              className="h-11 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send invite"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyConnections() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center">
      <h3 className="text-sm font-semibold text-neutral-900">No connections yet</h3>
      <p className="mt-1 text-sm text-neutral-500">
        You can only invite people you're connected with. Go discover travelers and send
        a connection request first.
      </p>
      <Link
        href="/discover"
        className="mt-4 inline-flex h-11 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Discover travelers
      </Link>
    </div>
  );
}
