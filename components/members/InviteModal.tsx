"use client";

import { useEffect, useRef, useState } from "react";
import type { InvitableUser } from "@/lib/types";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import { searchInvitableUsers, createInvite } from "@/app/actions/invites";
import SheetHandle from "@/components/ui/SheetHandle";

type Props = {
  tripId: string;
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function InviteModal({ tripId, open, onClose, onInvited }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvitableUser[]>([]);
  const [selected, setSelected] = useState<InvitableUser | null>(null);
  const [emailFallback, setEmailFallback] = useState<string | null>(null);
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setEmailFallback(null);
      setRole("editor");
      setError(null);
      setInviteLink(null);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setEmailFallback(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const found = await searchInvitableUsers(tripId, q);
      setResults(found);
      setEmailFallback(EMAIL_RE.test(q) ? q : null);
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, tripId]);

  if (!open) return null;

  const targetEmail = selected?.email ?? emailFallback;
  const canSend = !!targetEmail && !sending;

  async function handleSend() {
    if (!targetEmail) return;
    setSending(true);
    setError(null);

    const result = await createInvite(tripId, targetEmail, role);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInviteLink(result.data.url);
    onInvited();
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/40 px-0 sm:px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHandle />
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">Invite people</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {inviteLink ? (
            <div className="space-y-3">
              <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Invite sent. Share the link below if needed.
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
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => {
                  setInviteLink(null);
                  setSelected(null);
                  setQuery("");
                }}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Invite someone else →
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Search by username, name, or email
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="alice or alice@example.com"
                  className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  autoFocus
                />
              </div>

              {query.trim().length >= 2 && (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200">
                  {searching && (
                    <div className="px-3 py-4 text-center text-sm text-neutral-400">Searching…</div>
                  )}
                  {!searching && results.length === 0 && !emailFallback && (
                    <div className="px-3 py-4 text-center text-sm text-neutral-400">
                      No matches. Enter a full email to invite by email.
                    </div>
                  )}
                  {!searching &&
                    results.map((u) => {
                      const profile = { id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url };
                      const active = selected?.id === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelected(u)}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                            active ? "bg-neutral-100" : "hover:bg-neutral-50"
                          }`}
                        >
                          <MemberAvatar profile={profile} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-neutral-900">
                              {memberDisplayName(profile)}
                            </div>
                            <div className="truncate text-xs text-neutral-500">{u.email}</div>
                          </div>
                          {active && (
                            <svg className="h-4 w-4 text-neutral-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  {!searching && emailFallback && !results.some((r) => r.email.toLowerCase() === emailFallback.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="flex w-full items-center gap-3 border-t border-neutral-100 px-3 py-2 text-left hover:bg-neutral-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zM3 20a9 9 0 0118 0" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-neutral-700">Invite by email</div>
                        <div className="truncate text-xs text-neutral-500">{emailFallback}</div>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {(selected || emailFallback) && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["editor", "viewer"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                          role === r
                            ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                            : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                        }`}
                      >
                        <div className="font-medium capitalize">{r}</div>
                        <div className="text-xs text-neutral-500">
                          {r === "editor" ? "Can edit trip details" : "Can view only"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
            </>
          )}
        </div>

        {!inviteLink && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send invite"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
