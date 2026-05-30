"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { sendTripMessage, deleteTripMessage, type TripMessage } from "@/app/actions/chat";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import SheetHandle from "@/components/ui/SheetHandle";

type Props = {
  tripId: string;
  currentUserId: string;
  memberNames: Record<string, string>;
  memberAvatars: Record<string, string | null>;
  initialMessages: TripMessage[];
};

const LS_KEY = (tripId: string) => `chat_last_seen:${tripId}`;

export default function TripChat({
  tripId,
  currentUserId,
  memberNames,
  memberAvatars,
  initialMessages,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TripMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const lastSeen = () => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(LS_KEY(tripId)) || "0");
  };

  const markAllSeen = useCallback(() => {
    if (typeof window === "undefined") return;
    const latest = messages[messages.length - 1];
    if (latest) {
      localStorage.setItem(LS_KEY(tripId), String(new Date(latest.created_at).getTime()));
    }
    setUnread(0);
  }, [messages, tripId]);

  // Recompute unread when messages change
  useEffect(() => {
    if (open) {
      markAllSeen();
      return;
    }
    const since = lastSeen();
    const count = messages.filter(
      (m) =>
        new Date(m.created_at).getTime() > since &&
        m.user_id !== currentUserId &&
        m.type === "text"
    ).length;
    setUnread(count);
  }, [messages, open, currentUserId, markAllSeen, tripId]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-chat:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_messages",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const row = payload.new as TripMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            // Reconcile with our own optimistic message (same author + content)
            // so a message we just sent isn't shown twice.
            const filtered = prev.filter(
              (m) =>
                !(
                  m.id.startsWith("temp-") &&
                  m.user_id === row.user_id &&
                  m.content.trim() === row.content.trim()
                )
            );
            return [...filtered, row];
          });

          // Browser notification when chat is closed AND message is from someone else
          if (
            row.user_id !== currentUserId &&
            row.type === "text" &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            const sender = row.user_id ? memberNames[row.user_id] ?? "Someone" : "Someone";
            new Notification(`${sender} · Trip chat`, {
              body: row.content.slice(0, 200),
              tag: `trip-chat-${tripId}`,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "trip_messages",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (!old?.id) return;
          setMessages((prev) => prev.filter((m) => m.id !== old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, currentUserId, memberNames]);

  // Autoscroll on new messages
  useEffect(() => {
    if (open) {
      const el = scrollerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, open]);

  // Ask for notification permission once on first open
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const optimisticId = `temp-${Date.now()}`;
    const optimistic: TripMessage = {
      id: optimisticId,
      trip_id: tripId,
      user_id: currentUserId,
      content: text,
      type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const draft = text;
    setText("");
    const r = await sendTripMessage(tripId, draft);
    setSending(false);
    if (!r.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setText(draft);
      toast.error(r.error);
      return;
    }
    // Reconcile the optimistic message with its real id so the realtime
    // INSERT (which dedups by id) doesn't add a duplicate.
    setMessages((prev) => {
      if (prev.some((m) => m.id === r.data)) {
        // Realtime already delivered the real row — drop the optimistic one.
        return prev.filter((m) => m.id !== optimisticId);
      }
      return prev.map((m) => (m.id === optimisticId ? { ...m, id: r.data } : m));
    });
  }

  async function handleDelete(messageId: string) {
    if (messageId.startsWith("temp-")) return;
    if (!confirm("Delete this message?")) return;
    const prev = messages;
    setMessages((cur) => cur.filter((m) => m.id !== messageId));
    const r = await deleteTripMessage(messageId);
    if (!r.ok) {
      setMessages(prev); // restore on failure
      toast.error(r.error);
    }
  }

  // Bucketize messages by day for headers
  const groups = useMemo(() => {
    const out: { date: string; items: TripMessage[] }[] = [];
    for (const m of messages) {
      const d = new Date(m.created_at).toLocaleDateString();
      const last = out[out.length - 1];
      if (last && last.date === d) last.items.push(m);
      else out.push({ date: d, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open trip chat"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg hover:bg-neutral-700 md:bottom-6"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Slide-over */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch"
          onClick={() => {
            setOpen(false);
            markAllSeen();
          }}
        >
          <div className="absolute inset-0 bg-neutral-900/40" />
          <div
            className="relative flex h-[100dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            <SheetHandle />
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-3">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Trip chat</h2>
                <p className="text-xs text-neutral-500">
                  Messages from your trip members
                </p>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  markAllSeen();
                }}
                aria-label="Close chat"
                className="flex h-10 w-10 items-center justify-center text-neutral-400 hover:text-neutral-700"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div
              ref={scrollerRef}
              className="flex-1 overflow-y-auto bg-neutral-50 px-4 py-4"
            >
              {messages.length === 0 ? (
                <p className="mt-10 text-center text-sm text-neutral-400">
                  No messages yet. Say hi 👋
                </p>
              ) : (
                groups.map((g) => (
                  <div key={g.date} className="mb-4">
                    <div className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                      {g.date}
                    </div>
                    <div className="space-y-2">
                      {g.items.map((m) => {
                        if (m.type === "system") {
                          return (
                            <div
                              key={m.id}
                              className="text-center text-xs italic text-neutral-500"
                            >
                              {m.content}
                            </div>
                          );
                        }
                        const isMe = m.user_id === currentUserId;
                        const name = m.user_id
                          ? memberNames[m.user_id] ?? "Someone"
                          : "Someone";
                        const avatar = m.user_id ? memberAvatars[m.user_id] ?? null : null;
                        return (
                          <div
                            key={m.id}
                            className={`group flex items-end gap-2 ${
                              isMe ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <MemberAvatar
                              profile={{
                                id: m.user_id ?? "",
                                username: null,
                                full_name: name,
                                avatar_url: avatar,
                              }}
                              size={26}
                            />
                            <div
                              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                                isMe
                                  ? "rounded-br-sm bg-neutral-900 text-white"
                                  : "rounded-bl-sm bg-white text-neutral-900 shadow-sm"
                              }`}
                            >
                              {!isMe && (
                                <div className="mb-0.5 text-[11px] font-semibold text-neutral-500">
                                  {name}
                                </div>
                              )}
                              <p className="whitespace-pre-line break-words">
                                {m.content}
                              </p>
                            </div>
                            {isMe && !m.id.startsWith("temp-") && (
                              <button
                                onClick={() => handleDelete(m.id)}
                                aria-label="Delete message"
                                className="flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full text-neutral-400 opacity-60 transition-opacity hover:bg-neutral-100 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a1 1 0 001 1h6a1 1 0 001-1V7" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleSend}
              className="flex shrink-0 items-center gap-2 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                className="h-11 flex-1 rounded-full border border-neutral-300 bg-neutral-50 px-4 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="flex h-11 items-center rounded-full bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Suppress an unused import warning when memberDisplayName isn't directly referenced.
void memberDisplayName;
