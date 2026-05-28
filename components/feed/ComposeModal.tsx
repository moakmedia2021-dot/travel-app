"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPost, uploadPostImage } from "@/app/actions/posts";
import SheetHandle from "@/components/ui/SheetHandle";
import { track } from "@/lib/analytics";

type Props = {
  open: boolean;
  onClose: () => void;
  trips: { id: string; title: string }[];
};

export default function ComposeModal({ open, onClose, trips }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [tripId, setTripId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setImageBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await uploadPostImage(fd);
    setImageBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setImageUrl(r.data);
  }

  async function handlePost() {
    if (!content.trim()) {
      setError("Write something first");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await createPost({
      content: content.trim(),
      trip_id: tripId || null,
      location_name: location.trim() || null,
      image_url: imageUrl,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    track("trip_post_created", {
      has_image: !!imageUrl,
      has_location: location.trim().length > 0,
      has_trip: !!tripId,
    });
    setContent("");
    setLocation("");
    setTripId("");
    setImageUrl(null);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/40 px-0 sm:px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHandle />
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">New post</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-5 py-5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="What's happening on your trip?"
            className="block w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            autoFocus
          />

          {imageUrl && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="max-h-60 w-full rounded-md object-cover" />
              <button
                onClick={() => setImageUrl(null)}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="Remove image"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImage}
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="📍 Location (optional)"
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <select
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            >
              <option value="">No trip</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={imageBusy}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
            </svg>
            {imageBusy ? "Uploading…" : imageUrl ? "Change photo" : "Add photo"}
          </button>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900">
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={busy}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
