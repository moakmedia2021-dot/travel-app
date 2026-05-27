"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  sendConnectionRequest,
  cancelConnection,
  removeConnection,
} from "@/app/actions/social";
import SheetHandle from "@/components/ui/SheetHandle";

type Connection = {
  id: string;
  status: string;
  requester_id: string;
  addressee_id: string;
} | null;

type Props = {
  targetId: string;
  currentUserId: string;
  connection: Connection;
};

export default function ConnectButton({ targetId, currentUserId, connection }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setBusy(true);
    setError(null);
    const r = await sendConnectionRequest(targetId, message.trim() || null);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setShowModal(false);
    setMessage("");
    router.refresh();
  }

  async function handleCancel() {
    if (!connection) return;
    setBusy(true);
    await cancelConnection(connection.id);
    setBusy(false);
    router.refresh();
  }

  async function handleRemove() {
    if (!confirm("Remove this connection?")) return;
    setBusy(true);
    await removeConnection(targetId);
    setBusy(false);
    router.refresh();
  }

  // Determine UI state
  if (connection?.status === "accepted") {
    return (
      <button
        onClick={handleRemove}
        disabled={busy}
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        ✓ Connected
      </button>
    );
  }

  if (connection?.status === "pending") {
    if (connection.requester_id === currentUserId) {
      return (
        <button
          onClick={handleCancel}
          disabled={busy}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          Cancel request
        </button>
      );
    }
    // They sent us a request — direct them to the connections page
    return (
      <a
        href="/connections"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Respond to request →
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Connect
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/40 px-0 sm:px-4" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SheetHandle />
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-900">Send connection request</h2>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-700" aria-label="Close">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 px-5 py-5">
              <label className="block text-sm font-medium text-neutral-700">
                Add a note <span className="text-neutral-400">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Hey! I'm headed to Tokyo around the same dates and saw you've been there before…"
                className="block w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
              <button onClick={() => setShowModal(false)} className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900">
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={busy}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
