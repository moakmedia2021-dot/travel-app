"use client";

import { useState } from "react";
import NewTripModal from "./NewTripModal";

type Props = {
  variant?: "primary" | "secondary";
  label?: string;
};

export default function NewTripButton({ variant = "primary", label = "New trip" }: Props) {
  const [open, setOpen] = useState(false);

  const className =
    variant === "primary"
      ? "inline-flex h-11 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
      : "inline-flex h-11 items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors";

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {label}
      </button>
      <NewTripModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
