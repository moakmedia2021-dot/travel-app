"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SheetHandle from "@/components/ui/SheetHandle";
import {
  listCollaborations,
  getCollaboration,
  saveCollaboration,
  deleteCollaboration,
  addActivity,
  deleteActivity,
} from "@/app/actions/business";
import {
  COLLAB_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  type Activity,
  type ActivityKind,
  type BusinessDocument,
  type Collaboration,
  type CollaborationInput,
  type CollabStatus,
} from "@/lib/business/types";

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

function money(v: number | null, currency: string) {
  if (v == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `$${v}`;
  }
}

function emptyInput(): CollaborationInput {
  return {
    name: "",
    property_name: "",
    property_url: "",
    location: "",
    email: "",
    phone: "",
    instagram: "",
    status: "lead",
    deal_value: null,
    currency: "USD",
    rate_type: "",
    start_date: null,
    end_date: null,
    notes: "",
  };
}

export default function CollaborationsPanel({ initial }: { initial: Collaboration[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CollabStatus | "all">("all");
  const [editing, setEditing] = useState<CollaborationInput | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setRows(initial), [initial]);

  async function refresh() {
    const next = await listCollaborations();
    setRows(next);
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return [r.name, r.property_name, r.location, r.email, r.instagram]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [rows, search, status]);

  const pipelineValue = rows
    .filter((r) => !["archived"].includes(r.status))
    .reduce((s, r) => s + (r.deal_value ?? 0), 0);

  function openAdd() {
    setEditing(emptyInput());
  }
  function openEdit(c: Collaboration) {
    setEditing({
      id: c.id,
      name: c.name,
      property_name: c.property_name ?? "",
      property_url: c.property_url ?? "",
      location: c.location ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      instagram: c.instagram ?? "",
      status: c.status,
      deal_value: c.deal_value,
      currency: c.currency,
      rate_type: c.rate_type ?? "",
      start_date: c.start_date,
      end_date: c.end_date,
      notes: c.notes ?? "",
    });
  }

  async function handleSave(input: CollaborationInput) {
    const r = await saveCollaboration(input);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(input.id ? "Updated" : "Collaboration added");
    setEditing(null);
    await refresh();
    router.refresh();
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this collaboration and all its activity?")) return;
    startTransition(async () => {
      const r = await deleteCollaboration(id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Deleted");
      setDetailId(null);
      setRows((prev) => prev.filter((x) => x.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Collaborations" value={String(rows.length)} />
        <Stat label="Active pipeline" value={money(pipelineValue, "USD")} />
        <Stat label="Booked+" value={String(rows.filter((r) => ["booked", "filming", "published", "paid"].includes(r.status)).length)} />
        <Stat label="Paid" value={String(rows.filter((r) => r.status === "paid").length)} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, property, location, email…"
          className="h-10 min-w-[14rem] flex-1 rounded-md border border-neutral-300 bg-white px-3 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CollabStatus | "all")}
          className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        >
          <option value="all">All statuses</option>
          {COLLAB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          onClick={openAdd}
          className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Add
        </button>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-400">
          {rows.length === 0 ? "No collaborations yet. Add your first one." : "Nothing matches."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
          {visible.map((c) => (
            <button
              key={c.id}
              onClick={() => setDetailId(c.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-neutral-900">{c.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
                <div className="truncate text-xs text-neutral-500">
                  {[c.property_name, c.location].filter(Boolean).join(" · ") || "No property set"}
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-neutral-700">
                {money(c.deal_value, c.currency)}
              </span>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <CollaborationEditor
          value={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
      {detailId && (
        <CollaborationDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(c) => {
            setDetailId(null);
            openEdit(c);
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-neutral-900">{value}</div>
    </div>
  );
}

// --------------------------------------------------------------------------
function CollaborationEditor({
  value,
  onChange,
  onClose,
  onSave,
}: {
  value: CollaborationInput;
  onChange: (v: CollaborationInput) => void;
  onClose: () => void;
  onSave: (v: CollaborationInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  function set<K extends keyof CollaborationInput>(k: K, v: CollaborationInput[K]) {
    onChange({ ...value, [k]: v });
  }
  async function submit() {
    if (!value.name.trim()) return;
    setSaving(true);
    await onSave(value);
    setSaving(false);
  }
  return (
    <Drawer title={value.id ? "Edit collaboration" : "New collaboration"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name / host" required>
          <input className={inputClass} value={value.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Property name">
            <input className={inputClass} value={value.property_name ?? ""} onChange={(e) => set("property_name", e.target.value)} />
          </Field>
          <Field label="Location">
            <input className={inputClass} value={value.location ?? ""} onChange={(e) => set("location", e.target.value)} />
          </Field>
        </div>
        <Field label="Airbnb / listing URL">
          <input className={inputClass} value={value.property_url ?? ""} onChange={(e) => set("property_url", e.target.value)} placeholder="https://airbnb.com/rooms/…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <input className={inputClass} type="email" value={value.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={value.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Instagram">
            <input className={inputClass} value={value.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle" />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={value.status} onChange={(e) => set("status", e.target.value as CollabStatus)}>
              {COLLAB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Deal value">
            <input
              className={inputClass}
              type="number"
              value={value.deal_value ?? ""}
              onChange={(e) => set("deal_value", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Currency">
            <input className={inputClass} value={value.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Rate type">
            <input className={inputClass} value={value.rate_type ?? ""} onChange={(e) => set("rate_type", e.target.value)} placeholder="flat / per video" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input className={inputClass} type="date" value={value.start_date ?? ""} onChange={(e) => set("start_date", e.target.value || null)} />
          </Field>
          <Field label="End date">
            <input className={inputClass} type="date" value={value.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={inputClass} rows={3} value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving || !value.name.trim()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Drawer>
  );
}

// --------------------------------------------------------------------------
const ACTIVITY_KINDS: { kind: ActivityKind; label: string }[] = [
  { kind: "note", label: "Note" },
  { kind: "email", label: "Email" },
  { kind: "call", label: "Call" },
  { kind: "meeting", label: "Meeting" },
];

function CollaborationDetail({
  id,
  onClose,
  onEdit,
  onDelete,
}: {
  id: string;
  onClose: () => void;
  onEdit: (c: Collaboration) => void;
  onDelete: (id: string) => void;
}) {
  const [data, setData] = useState<{
    collab: Collaboration;
    activities: Activity[];
    documents: BusinessDocument[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<ActivityKind>("note");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let active = true;
    getCollaboration(id).then((d) => {
      if (active) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  async function log() {
    if (!body.trim()) return;
    setPosting(true);
    const r = await addActivity(id, kind, body);
    setPosting(false);
    if (!r.ok) return void toast.error(r.error);
    setBody("");
    setData((d) => (d ? { ...d, activities: [r.data, ...d.activities] } : d));
  }

  async function removeActivity(activityId: string) {
    const r = await deleteActivity(activityId);
    if (!r.ok) return void toast.error(r.error);
    setData((d) => (d ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) } : d));
  }

  const c = data?.collab;

  return (
    <Drawer title={c?.name ?? "Collaboration"} onClose={onClose}>
      {loading || !c ? (
        <p className="py-10 text-center text-sm text-neutral-400">{loading ? "Loading…" : "Not found"}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
              {STATUS_LABELS[c.status]}
            </span>
            <span className="text-sm font-semibold text-neutral-700">{money(c.deal_value, c.currency)}</span>
            {c.rate_type && <span className="text-xs text-neutral-400">{c.rate_type}</span>}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Detail label="Property" value={c.property_name} />
            <Detail label="Location" value={c.location} />
            <Detail label="Email" value={c.email} />
            <Detail label="Phone" value={c.phone} />
            <Detail label="Instagram" value={c.instagram} />
            <Detail
              label="Dates"
              value={[c.start_date, c.end_date].filter(Boolean).join(" → ") || null}
            />
          </dl>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                onClick={() => addActivity(id, "email", `Emailed ${c.email}`)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                ✉️ Email
              </a>
            )}
            {c.property_url && (
              <a
                href={c.property_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                🔗 Listing
              </a>
            )}
            {c.instagram && (
              <a
                href={`https://instagram.com/${c.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                📸 Instagram
              </a>
            )}
            <button
              onClick={() => onEdit(c)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => onDelete(c.id)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>

          {c.notes && (
            <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600 whitespace-pre-line">
              {c.notes}
            </div>
          )}

          {/* Activity log */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">Activity</h3>
            <div className="mb-3 space-y-2">
              <div className="flex gap-2">
                <select value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} className="rounded-md border border-neutral-300 px-2 text-sm">
                  {ACTIVITY_KINDS.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && log()}
                  placeholder="Log an interaction…"
                  className={inputClass}
                />
                <button
                  onClick={log}
                  disabled={posting || !body.trim()}
                  className="shrink-0 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {data.activities.length === 0 && (
                <li className="text-sm text-neutral-400">No activity yet.</li>
              )}
              {data.activities.map((a) => (
                <li key={a.id} className="group flex items-start gap-2 rounded-md border border-neutral-100 px-3 py-2">
                  <span className="mt-0.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-500">
                    {a.kind}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-700">{a.body}</p>
                    <p className="text-[11px] text-neutral-400">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => removeActivity(a.id)}
                    className="text-xs text-neutral-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
                    aria-label="Delete activity"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="text-neutral-800">{value || <span className="text-neutral-300">—</span>}</dd>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50" aria-modal>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        <SheetHandle />
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="truncate text-base font-semibold text-neutral-900">{title}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center text-neutral-400 hover:text-neutral-700" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
