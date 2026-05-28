"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  findUserByExactUsername,
  sendConnectionRequest,
  type FindUserResult,
} from "@/app/actions/social";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import { track } from "@/lib/analytics";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; result: FindUserResult }
  | { kind: "missing"; query: string };

export default function UsernameSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().replace(/^@/, "");
    if (!q) return;
    setState({ kind: "loading" });
    setSendError(null);
    const result = await findUserByExactUsername(q);
    setState(result ? { kind: "found", result } : { kind: "missing", query: q });
  }

  async function handleConnect() {
    if (state.kind !== "found") return;
    setSending(true);
    setSendError(null);
    const r = await sendConnectionRequest(state.result.profile.id, null);
    setSending(false);
    if (!r.ok) {
      setSendError(r.error);
      return;
    }
    track("connection_requested", {
      target_id: state.result.profile.id,
      source: "username_search",
    });
    // Refresh state — connection is now pending
    setState({
      kind: "found",
      result: { ...state.result, connectionStatus: "pending" },
    });
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Find someone by username</h2>
      <p className="mt-0.5 text-xs text-neutral-500">
        Type the exact username. Partial matches won't show up — by design.
      </p>

      <form onSubmit={handleSearch} className="mt-3 flex gap-2">
        <div className="flex flex-1 items-center rounded-md border border-neutral-300 bg-white shadow-sm focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
          <span className="pl-3 text-sm text-neutral-400">@</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toLowerCase())}
            placeholder="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="block w-full bg-transparent px-2 py-2.5 text-sm focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={state.kind === "loading" || !query.trim()}
          className="h-11 rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {state.kind === "loading" ? "Searching…" : "Search"}
        </button>
      </form>

      {state.kind === "missing" && (
        <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          No user with username <span className="font-mono">@{state.query}</span>. Double-check the
          spelling.
        </p>
      )}

      {state.kind === "found" && (
        <FoundResult
          result={state.result}
          onConnect={handleConnect}
          sending={sending}
          error={sendError}
        />
      )}
    </section>
  );
}

function FoundResult({
  result,
  onConnect,
  sending,
  error,
}: {
  result: FindUserResult;
  onConnect: () => void;
  sending: boolean;
  error: string | null;
}) {
  const { profile, isMe, connectionStatus } = result;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
      <MemberAvatar profile={profile} size={44} />
      <div className="min-w-0 flex-1">
        <Link
          href={profile.username ? `/profile/${profile.username}` : "#"}
          className="block truncate text-sm font-semibold text-neutral-900 hover:underline"
        >
          {memberDisplayName(profile)}
        </Link>
        {profile.username && (
          <div className="truncate text-xs text-neutral-500">@{profile.username}</div>
        )}
      </div>

      {isMe ? (
        <span className="text-xs font-medium text-neutral-400">That's you</span>
      ) : connectionStatus === "accepted" ? (
        <span className="text-xs font-medium text-green-700">Connected</span>
      ) : connectionStatus === "pending" ? (
        <span className="text-xs font-medium text-neutral-500">Request pending</span>
      ) : (
        <button
          onClick={onConnect}
          disabled={sending}
          className="h-10 rounded-md bg-neutral-900 px-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {sending ? "…" : "Connect"}
        </button>
      )}

      {error && (
        <p className="ml-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
