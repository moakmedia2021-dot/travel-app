"use client";

import { useState } from "react";
import Link from "next/link";
import type { FeedItem } from "@/lib/types";
import PostCard from "./PostCard";
import ComposeModal from "./ComposeModal";

type Props = {
  initialItems: FeedItem[];
  trips: { id: string; title: string }[];
};

export default function FeedView({ initialItems, trips }: Props) {
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Feed</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Posts and tips from people you follow
          </p>
        </div>
        <button
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Post
        </button>
      </div>

      {initialItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <h2 className="text-base font-medium text-neutral-900">Your feed is empty</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Follow other travelers to see their posts here, or share your own.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/discover"
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Discover travelers
            </Link>
            <button
              onClick={() => setComposeOpen(true)}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Write a post
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {initialItems.map((item) => (
            <PostCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}

      {/* FAB on mobile */}
      <button
        onClick={() => setComposeOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg hover:bg-neutral-700 sm:hidden"
        aria-label="New post"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} trips={trips} />
    </div>
  );
}
