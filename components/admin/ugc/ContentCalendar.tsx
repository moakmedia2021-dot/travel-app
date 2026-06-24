"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SheetHandle from "@/components/ui/SheetHandle";
import { listVideos, saveVideo, deleteVideo } from "@/app/actions/ugc";
import {
  PLATFORMS,
  PLATFORM_EMOJI,
  PLATFORM_LABELS,
  VIDEO_STATUSES,
  VIDEO_STATUS_COLORS,
  VIDEO_STATUS_LABELS,
  type Platform,
  type UgcClient,
  type UgcVideo,
  type VideoInput,
} from "@/lib/ugc/types";

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function calDate(v: UgcVideo): string | null {
  return v.posted_on || v.scheduled_for;
}

export default function ContentCalendar({
  clients,
  initialVideos,
}: {
  clients: UgcClient[];
  initialVideos: UgcVideo[];
}) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [editing, setEditing] = useState<VideoInput | null>(null);

  useEffect(() => setVideos(initialVideos), [initialVideos]);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  async function refresh() {
    setVideos(await listVideos());
  }

  const byDay = useMemo(() => {
    const map = new Map<string, UgcVideo[]>();
    for (const v of videos) {
      const d = calDate(v);
      if (!d) continue;
      const arr = map.get(d) ?? [];
      arr.push(v);
      map.set(d, arr);
    }
    return map;
  }, [videos]);

  // Build the month grid (leading + trailing blanks to fill whole weeks).
  const cells = useMemo(() => {
    const firstWeekday = cursor.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let day = 1; day <= daysInMonth; day++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const todayStr = ymd(new Date());
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function emptyVideo(dateStr?: string): VideoInput {
    return {
      client_id: clients[0]?.id ?? "",
      account_id: null,
      title: "",
      platform: null,
      status: dateStr && dateStr < todayStr ? "posted" : "scheduled",
      scheduled_for: dateStr ?? null,
      posted_on: null,
      url: "",
      notes: "",
    };
  }

  async function handleSave(input: VideoInput) {
    if (!input.client_id) return void toast.error("Pick a client first");
    const r = await saveVideo(input);
    if (!r.ok) return void toast.error(r.error);
    toast.success(input.id ? "Video updated" : "Video added");
    setEditing(null);
    await refresh();
    router.refresh();
  }

  async function handleDelete(videoId: string) {
    if (!confirm("Delete this video?")) return;
    const r = await deleteVideo(videoId);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Deleted");
    setEditing(null);
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    router.refresh();
  }

  function openEdit(v: UgcVideo) {
    setEditing({
      id: v.id,
      client_id: v.client_id,
      account_id: v.account_id,
      title: v.title,
      platform: v.platform,
      status: v.status,
      scheduled_for: v.scheduled_for,
      posted_on: v.posted_on,
      url: v.url ?? "",
      notes: v.notes ?? "",
    });
  }

  const monthCount = videos.filter((v) => {
    const d = calDate(v);
    return d && d.slice(0, 7) === ymd(cursor).slice(0, 7);
  }).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            aria-label="Previous month"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold text-neutral-900">{monthLabel}</span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            aria-label="Next month"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="ml-1 text-xs text-neutral-400">{monthCount} this month</span>
        </div>
        <button
          onClick={() => setEditing(emptyVideo(todayStr))}
          disabled={clients.length === 0}
          className="h-9 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          + Video
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-400">
          Add a client first, then schedule videos here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>
          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const dateStr = d ? ymd(d) : "";
              const dayVideos = d ? byDay.get(dateStr) ?? [] : [];
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={i}
                  className={`min-h-[84px] border-b border-r border-neutral-100 p-1.5 ${
                    d ? "cursor-pointer hover:bg-neutral-50" : "bg-neutral-50/50"
                  }`}
                  onClick={d ? () => setEditing(emptyVideo(dateStr)) : undefined}
                >
                  {d && (
                    <>
                      <div
                        className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                          isToday ? "bg-neutral-900 font-semibold text-white" : "text-neutral-400"
                        }`}
                      >
                        {d.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayVideos.slice(0, 3).map((v) => {
                          const client = clientById.get(v.client_id);
                          return (
                            <button
                              key={v.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(v);
                              }}
                              className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] text-white"
                              style={{ backgroundColor: client?.color ?? "#2563eb" }}
                              title={`${v.title}${client ? ` · ${client.name}` : ""}`}
                            >
                              <span className="shrink-0">{v.platform ? PLATFORM_EMOJI[v.platform] : "🎬"}</span>
                              <span className="min-w-0 flex-1 truncate">{v.title}</span>
                            </button>
                          );
                        })}
                        {dayVideos.length > 3 && (
                          <div className="px-1 text-[10px] text-neutral-400">+{dayVideos.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <VideoEditor
          value={editing}
          clients={clients}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={editing.id ? () => handleDelete(editing.id!) : undefined}
        />
      )}
    </div>
  );
}

function VideoEditor({
  value,
  clients,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  value: VideoInput;
  clients: UgcClient[];
  onChange: (v: VideoInput) => void;
  onClose: () => void;
  onSave: (v: VideoInput) => Promise<void>;
  onDelete?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  function set<K extends keyof VideoInput>(k: K, v: VideoInput[K]) {
    onChange({ ...value, [k]: v });
  }
  async function submit() {
    if (!value.title.trim() || !value.client_id) return;
    setSaving(true);
    await onSave(value);
    setSaving(false);
  }
  return (
    <div className="fixed inset-0 z-50" aria-modal>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <SheetHandle />
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">{value.id ? "Edit video" : "New video"}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center text-neutral-400 hover:text-neutral-700" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          <Field label="Client" required>
            <select className={inputClass} value={value.client_id} onChange={(e) => set("client_id", e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" required>
            <input className={inputClass} value={value.title} onChange={(e) => set("title", e.target.value)} placeholder="Hook / concept" autoFocus />
          </Field>
          <Field label="Platform">
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("platform", value.platform === p ? null : p)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    value.platform === p ? "border-neutral-900 bg-neutral-50 text-neutral-900" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                  }`}
                >
                  <span>{PLATFORM_EMOJI[p]}</span>
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Status">
            <div className="flex flex-wrap gap-1.5">
              {VIDEO_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", s)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    value.status === s ? "bg-neutral-900 text-white" : `${VIDEO_STATUS_COLORS[s]} hover:opacity-80`
                  }`}
                >
                  {VIDEO_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Scheduled for">
              <input className={inputClass} type="date" value={value.scheduled_for ?? ""} onChange={(e) => set("scheduled_for", e.target.value || null)} />
            </Field>
            <Field label="Posted on">
              <input className={inputClass} type="date" value={value.posted_on ?? ""} onChange={(e) => set("posted_on", e.target.value || null)} />
            </Field>
          </div>
          <Field label="Link">
            <input className={inputClass} value={value.url ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Notes">
            <textarea className={inputClass} rows={2} value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-5 py-4">
          {onDelete ? (
            <button onClick={onDelete} className="text-sm font-medium text-red-600 hover:text-red-700">
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving || !value.title.trim() || !value.client_id}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
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
