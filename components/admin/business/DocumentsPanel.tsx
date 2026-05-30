"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SheetHandle from "@/components/ui/SheetHandle";
import { saveDocument, deleteDocument, draftContract } from "@/app/actions/business";
import { buildDocHtml } from "./docHtml";
import type {
  BusinessDocument,
  Collaboration,
  DocType,
  DocumentContent,
  InvoiceLineItem,
} from "@/lib/business/types";

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

function money(v: number | null | undefined, currency = "USD") {
  const n = Number(v) || 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

type Draft = {
  id?: string | null;
  type: DocType;
  collaboration_id: string | null;
  title: string;
  content: DocumentContent;
};

export default function DocumentsPanel({
  initial,
  collaborations,
}: {
  initial: BusinessDocument[];
  collaborations: Collaboration[];
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [, startTransition] = useTransition();

  function newInvoice() {
    setDraft({
      type: "invoice",
      collaboration_id: null,
      title: "Invoice",
      content: {
        currency: "USD",
        issued_on: new Date().toISOString().slice(0, 10),
        from: {},
        to: {},
        line_items: [{ description: "Content package", quantity: 1, rate: 0 }],
        notes: "",
      },
    });
  }
  function newContract() {
    setDraft({
      type: "contract",
      collaboration_id: null,
      title: "Collaboration agreement",
      content: { effective_date: new Date().toISOString().slice(0, 10), from: {}, to: {}, body: "" },
    });
  }

  function edit(d: BusinessDocument) {
    setDraft({ id: d.id, type: d.type, collaboration_id: d.collaboration_id, title: d.title, content: d.content });
  }

  function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    startTransition(async () => {
      const r = await deleteDocument(id);
      if (!r.ok) return void toast.error(r.error);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    });
  }

  function print(d: BusinessDocument) {
    const html = buildDocHtml(d);
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return void toast.error("Allow pop-ups to print");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={newInvoice} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
          + Invoice
        </button>
        <button onClick={newContract} className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          + Contract
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-400">
          No documents yet. Create an invoice or contract.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${d.type === "invoice" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>
                {d.type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {d.number ? `${d.number} · ` : ""}
                  {d.title}
                </p>
                <p className="text-xs text-neutral-500">{new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              {d.total != null && <span className="text-sm font-semibold text-neutral-700">{money(d.total, d.content.currency)}</span>}
              <div className="flex gap-1">
                <button onClick={() => print(d)} className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                  Print / PDF
                </button>
                <button onClick={() => edit(d)} className="rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-900">
                  Edit
                </button>
                <button onClick={() => remove(d.id)} className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <DocEditor
          draft={draft}
          setDraft={setDraft}
          collaborations={collaborations}
          onClose={() => setDraft(null)}
          onSaved={(saved) => {
            setDocs((prev) => {
              const i = prev.findIndex((d) => d.id === saved.id);
              if (i >= 0) {
                const copy = [...prev];
                copy[i] = saved;
                return copy;
              }
              return [saved, ...prev];
            });
            setDraft(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function lineTotal(li: InvoiceLineItem) {
  return (Number(li.quantity) || 0) * (Number(li.rate) || 0);
}

function DocEditor({
  draft,
  setDraft,
  collaborations,
  onClose,
  onSaved,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  collaborations: Collaboration[];
  onClose: () => void;
  onSaved: (d: BusinessDocument) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const c = draft.content;

  function setContent(patch: Partial<DocumentContent>) {
    setDraft({ ...draft, content: { ...draft.content, ...patch } });
  }

  function applyCollab(id: string) {
    const collab = collaborations.find((x) => x.id === id);
    setDraft({
      ...draft,
      collaboration_id: id || null,
      content: collab
        ? {
            ...draft.content,
            currency: collab.currency || draft.content.currency,
            to: {
              name: collab.name,
              email: collab.email ?? undefined,
              property: collab.property_name ?? undefined,
              location: collab.location ?? undefined,
            },
            line_items:
              draft.type === "invoice" && collab.deal_value
                ? [{ description: collab.property_name ? `Content for ${collab.property_name}` : "Content package", quantity: 1, rate: collab.deal_value }]
                : draft.content.line_items,
          }
        : draft.content,
    });
  }

  const items = c.line_items ?? [];
  const total = useMemo(() => items.reduce((s, li) => s + lineTotal(li), 0), [items]);

  function setItem(i: number, patch: Partial<InvoiceLineItem>) {
    const next = items.map((li, idx) => (idx === i ? { ...li, ...patch } : li));
    setContent({ line_items: next });
  }
  function addItem() {
    setContent({ line_items: [...items, { description: "", quantity: 1, rate: 0 }] });
  }
  function removeItem(i: number) {
    setContent({ line_items: items.filter((_, idx) => idx !== i) });
  }

  async function aiDraft() {
    setDrafting(true);
    const r = await draftContract({
      creatorName: c.from?.name || "Creator",
      businessName: c.from?.business || "",
      hostName: c.to?.name || "Host",
      property: c.to?.property || "",
      location: c.to?.location || "",
      deliverables: "social content (Reels / YouTube)",
      compensation: "as agreed",
      timeline: c.effective_date || "as agreed",
    });
    setDrafting(false);
    if (!r.ok) return void toast.error(r.error);
    setContent({ body: r.data });
  }

  async function save() {
    setSaving(true);
    const r = await saveDocument({
      id: draft.id,
      collaboration_id: draft.collaboration_id,
      type: draft.type,
      title: draft.title,
      content: draft.content,
      total: draft.type === "invoice" ? total : null,
    });
    setSaving(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Saved");
    onSaved({
      id: r.data,
      collaboration_id: draft.collaboration_id,
      type: draft.type,
      number: null,
      title: draft.title,
      content: draft.content,
      total: draft.type === "invoice" ? total : null,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50" aria-modal>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        <SheetHandle />
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            {draft.id ? "Edit" : "New"} {draft.type}
          </h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center text-neutral-400 hover:text-neutral-700" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {collaborations.length > 0 && (
            <select className={inputClass} value={draft.collaboration_id ?? ""} onChange={(e) => applyCollab(e.target.value)}>
              <option value="">Link to a collaboration…</option>
              {collaborations.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}

          <input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 rounded-md border border-neutral-200 p-3">
              <p className="text-xs font-semibold uppercase text-neutral-400">From (you)</p>
              <input className={inputClass} placeholder="Name" value={c.from?.name ?? ""} onChange={(e) => setContent({ from: { ...c.from, name: e.target.value } })} />
              <input className={inputClass} placeholder="Business" value={c.from?.business ?? ""} onChange={(e) => setContent({ from: { ...c.from, business: e.target.value } })} />
              <input className={inputClass} placeholder="Email" value={c.from?.email ?? ""} onChange={(e) => setContent({ from: { ...c.from, email: e.target.value } })} />
            </div>
            <div className="space-y-2 rounded-md border border-neutral-200 p-3">
              <p className="text-xs font-semibold uppercase text-neutral-400">To (host)</p>
              <input className={inputClass} placeholder="Name" value={c.to?.name ?? ""} onChange={(e) => setContent({ to: { ...c.to, name: e.target.value } })} />
              <input className={inputClass} placeholder="Property" value={c.to?.property ?? ""} onChange={(e) => setContent({ to: { ...c.to, property: e.target.value } })} />
              <input className={inputClass} placeholder="Email" value={c.to?.email ?? ""} onChange={(e) => setContent({ to: { ...c.to, email: e.target.value } })} />
            </div>
          </div>

          {draft.type === "invoice" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">Issued</span>
                  <input type="date" className={inputClass} value={c.issued_on ?? ""} onChange={(e) => setContent({ issued_on: e.target.value })} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">Due</span>
                  <input type="date" className={inputClass} value={c.due_on ?? ""} onChange={(e) => setContent({ due_on: e.target.value })} />
                </label>
              </div>

              <p className="text-xs font-semibold uppercase text-neutral-400">Line items</p>
              {items.map((li, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={`${inputClass} flex-1`} placeholder="Description" value={li.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                  <input className={`${inputClass} w-16`} type="number" value={li.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} />
                  <input className={`${inputClass} w-24`} type="number" value={li.rate} onChange={(e) => setItem(i, { rate: Number(e.target.value) })} />
                  <span className="w-20 text-right text-sm tabular-nums text-neutral-600">{money(lineTotal(li), c.currency)}</span>
                  <button onClick={() => removeItem(i)} className="text-neutral-300 hover:text-red-500" aria-label="Remove">✕</button>
                </div>
              ))}
              <button onClick={addItem} className="text-sm font-medium text-blue-600 hover:text-blue-700">+ Add line</button>
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                <span className="text-sm font-medium text-neutral-500">Total</span>
                <span className="text-base font-semibold text-neutral-900">{money(total, c.currency)}</span>
              </div>
              <textarea className={inputClass} rows={2} placeholder="Notes / payment terms" value={c.notes ?? ""} onChange={(e) => setContent({ notes: e.target.value })} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-neutral-400">Agreement body</p>
                <button onClick={aiDraft} disabled={drafting} className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50">
                  {drafting ? "Drafting…" : "✨ AI draft"}
                </button>
              </div>
              <textarea className={`${inputClass} font-mono`} rows={14} placeholder="Write or generate the agreement…" value={c.body ?? ""} onChange={(e) => setContent({ body: e.target.value })} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
