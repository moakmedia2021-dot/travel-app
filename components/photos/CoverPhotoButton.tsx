"use client";

import { useState } from "react";
import CoverPhotoPicker from "./CoverPhotoPicker";

type Props = {
  tripId: string;
  destination: string;
  hasCover: boolean;
};

export default function CoverPhotoButton({ tripId, destination, hasCover }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur hover:bg-white"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
        </svg>
        {hasCover ? "Change cover" : "Add cover photo"}
      </button>
      <CoverPhotoPicker
        open={open}
        onClose={() => setOpen(false)}
        tripId={tripId}
        initialQuery={destination}
      />
    </>
  );
}
