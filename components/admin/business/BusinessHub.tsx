"use client";

import { useState } from "react";
import CollaborationsPanel from "./CollaborationsPanel";
import ContentStudio from "./ContentStudio";
import DocumentsPanel from "./DocumentsPanel";
import ThumbnailStudio from "./ThumbnailStudio";
import type { BusinessDocument, Collaboration } from "@/lib/business/types";

type Tab = "crm" | "studio" | "documents" | "thumbnails";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "crm", label: "Collaborations", icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" },
  { id: "studio", label: "Content Studio", icon: "M15 10l4.55-2.28A1 1 0 0121 8.6v6.8a1 1 0 01-1.45.88L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { id: "documents", label: "Documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.59a1 1 0 01.7.29l4.42 4.42a1 1 0 01.29.7V19a2 2 0 01-2 2z" },
  { id: "thumbnails", label: "Thumbnails", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 6h16v12H4z" },
];

export default function BusinessHub({
  initialCollaborations,
  initialDocuments,
}: {
  initialCollaborations: Collaboration[];
  initialDocuments: BusinessDocument[];
}) {
  const [tab, setTab] = useState<Tab>("crm");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "crm" && <CollaborationsPanel initial={initialCollaborations} />}
      {tab === "studio" && <ContentStudio collaborations={initialCollaborations} />}
      {tab === "documents" && (
        <DocumentsPanel initial={initialDocuments} collaborations={initialCollaborations} />
      )}
      {tab === "thumbnails" && <ThumbnailStudio />}
    </div>
  );
}
