"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UnsplashPhoto } from "@/lib/unsplash";
import { searchCoverPhotos, setTripCover, unsplashConfigured } from "@/app/actions/photos";
import SheetHandle from "@/components/ui/SheetHandle";

type Props = {
  open: boolean;
  onClose: () => void;
  tripId: string;
  initialQuery: string;
};

export default function CoverPhotoPicker({ open, onClose, tripId, initialQuery }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setError(null);
    setPhotos([]);
    unsplashConfigured().then(setConfigured);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open || !configured || !query.trim()) return;
    void doSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, configured]);

  async function doSearch(q: string) {
    setLoading(true);
    setError(null);
    const r = await searchCoverPhotos(q);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setPhotos(r.data);
  }

  async function handlePick(photo: UnsplashPhoto) {
    setSaving(photo.id);
    const r = await setTripCover(tripId, photo.regularUrl);
    setSaving(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onClose();
    router.refresh();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/50 px-0 sm:px-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl rounded-t-2xl sm:rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <SheetHandle />
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">Choose a cover photo</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {configured === false ? (
            <div className="rounded-md border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
              Set <code className="rounded bg-neutral-100 px-1 text-xs">UNSPLASH_ACCESS_KEY</code> in{" "}
              <code className="rounded bg-neutral-100 px-1 text-xs">.env.local</code> and restart the dev server.
              <br />
              Get a free key at{" "}
              <a href="https://unsplash.com/developers" target="_blank" rel="noreferrer" className="font-medium text-neutral-700 underline">
                unsplash.com/developers
              </a>
              .
            </div>
          ) : (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void doSearch(query);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tokyo, beach, mountains…"
                  className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  {loading ? "…" : "Search"}
                </button>
              </form>

              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <div className="max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {photos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePick(p)}
                      disabled={saving !== null}
                      className="group relative aspect-[4/3] overflow-hidden rounded-md border border-neutral-200 disabled:opacity-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.thumbUrl}
                        alt={p.description ?? ""}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-left text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        Photo: {p.photographer}
                      </div>
                      {saving === p.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-medium">
                          Setting…
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {photos.length === 0 && !loading && query.trim() && (
                  <p className="py-8 text-center text-sm text-neutral-400">
                    No photos found. Try a different search.
                  </p>
                )}
              </div>
              <p className="text-[10px] text-neutral-400">
                Photos from{" "}
                <a href="https://unsplash.com?utm_source=travel_app&utm_medium=referral" target="_blank" rel="noreferrer" className="underline">
                  Unsplash
                </a>
                . Photographer credits shown on hover.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
