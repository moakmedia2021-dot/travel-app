"use client";

import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={4000}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-neutral-200 bg-white text-sm",
        },
      }}
    />
  );
}
