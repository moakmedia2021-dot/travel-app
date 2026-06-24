"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SheetHandle from "@/components/ui/SheetHandle";
import {
  listClients,
  getClient,
  saveClient,
  deleteClient,
  saveAccount,
  deleteAccount,
} from "@/app/actions/ugc";
import {
  CLIENT_COLORS,
  PLATFORM_EMOJI,
  PLATFORM_LABELS,
  PLATFORMS,
  RATE_PERIOD_LABELS,
  RATE_PERIODS,
  STATUS_COLORS,
  STATUS_LABELS,
  UGC_STATUSES,
  VIDEO_STATUS_COLORS,
  VIDEO_STATUS_LABELS,
  type AccountInput,
  type ClientInput,
  type Platform,
  type UgcAccount,
  type UgcClient,
  type UgcStatus,
  type UgcVideo,
} from "@/lib/ugc/types";

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

function emptyClient(): ClientInput {
  return {
    name: "",
    email: "",
    phone: "",
    status: "active",
    rate: null,
    rate_period: "per_video",
    currency: "USD",
    color: CLIENT_COLORS[0],
    notes: "",
  };
}

export default function ClientsPanel({ initial }: { initial: UgcClient[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ClientInput | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setRows(initial), [initial]);

  async function refresh() {
    setRows(await listClients());
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.name, r.email].filter(Boolean).some((v) => v!.toLowerCase().includes(q)));
  }, [rows, search]);

  async function handleSave(input: ClientInput) {
    const r = await saveClient(input);
    if (!r.ok) return void toast.error(r.error);
    toast.success(input.id ? "Client updated" : "Client added");
    setEditing(null);
    await refresh();
    router.refresh();
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this client and all their accounts + videos?")) return;
    startTransition(async () => {
      const r = await deleteClient(id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Deleted");
      setDetailId(null);
      setRows((prev) => prev.filter((x) => x.id !== id));
      router.refresh();
    });
  }

  function openEdit(c: UgcClient) {
    setEditing({
      id: c.id,
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      status: c.status,
      rate: c.rate,
      rate_period: c.rate_period,
      currency: c.currency,
      color: c.color ?? CLIENT_COLORS[0],
      notes: c.notes ?? "",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="h-10 min-w-[12rem] flex-1 rounded-md border border-neutral-300 bg-white px-3 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
        <button
          onClick={() => setEditing(emptyClient())}
          className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Client
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-400">
          {rows.length === 0 ? "No clients yet. Add your first one." : "Nothing matches."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
          {visible.map((c) => (
            <button
              key={c.id}
              onClick={() => setDetailId(c.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: c.color ?? "#2563eb" }}
              >
                {c.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-neutral-900">{c.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
                <div className="truncate text-xs text-neutral-500">{c.email || "No email"}</div>
              </div>
              <span className="shrink-0 text-right text-sm">
                <span className="font-semibold text-neutral-900">{money(c.rate, c.currency)}</span>
                <span className="block text-[11px] text-neutral-400">{RATE_PERIOD_LABELS[c.rate_period]}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <ClientEditor value={editing} onChange={setEditing} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
      {detailId && (
        <ClientDetail
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

// --------------------------------------------------------------------------
function ClientEditor({
  value,
  onChange,
  onClose,
  onSave,
}: {
  value: ClientInput;
  onChange: (v: ClientInput) => void;
  onClose: () => void;
  onSave: (v: ClientInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  function set<K extends keyof ClientInput>(k: K, v: ClientInput[K]) {
    onChange({ ...value, [k]: v });
  }
  async function submit() {
    if (!value.name.trim()) return;
    setSaving(true);
    await onSave(value);
    setSaving(false);
  }
  return (
    <Drawer title={value.id ? "Edit client" : "New client"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name" required>
          <input className={inputClass} value={value.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <input className={inputClass} value={value.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={value.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </div>
        <Field label="Status">
          <div className="grid grid-cols-4 gap-2">
            {UGC_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("status", s)}
                className={`rounded-md border px-2 py-2 text-xs font-medium capitalize transition-colors ${
                  value.status === s
                    ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Rate">
            <input
              className={inputClass}
              type="number"
              value={value.rate ?? ""}
              onChange={(e) => set("rate", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Per">
            <select className={inputClass} value={value.rate_period} onChange={(e) => set("rate_period", e.target.value as ClientInput["rate_period"])}>
              {RATE_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {RATE_PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <input className={inputClass} value={value.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
          </Field>
        </div>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {CLIENT_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => set("color", col)}
                className={`h-7 w-7 rounded-full border-2 ${value.color === col ? "scale-110 border-neutral-900" : "border-transparent"}`}
                style={{ backgroundColor: col }}
                aria-label={col}
              />
            ))}
          </div>
        </Field>
        <Field label="Notes">
          <textarea className={inputClass} rows={2} value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
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
function emptyAccount(clientId: string): AccountInput {
  return {
    client_id: clientId,
    platform: "tiktok",
    handle: "",
    url: "",
    login_email: "",
    login_password: "",
    notes: "",
  };
}

function ClientDetail({
  id,
  onClose,
  onEdit,
  onDelete,
}: {
  id: string;
  onClose: () => void;
  onEdit: (c: UgcClient) => void;
  onDelete: (id: string) => void;
}) {
  const [data, setData] = useState<{ client: UgcClient; accounts: UgcAccount[]; videos: UgcVideo[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accEditing, setAccEditing] = useState<AccountInput | null>(null);

  async function load() {
    const d = await getClient(id);
    setData(d);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveAcc(input: AccountInput) {
    const r = await saveAccount(input);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Account saved");
    setAccEditing(null);
    load();
  }
  async function delAcc(accId: string) {
    if (!confirm("Delete this account + its credentials?")) return;
    const r = await deleteAccount(accId);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Account deleted");
    setData((d) => (d ? { ...d, accounts: d.accounts.filter((a) => a.id !== accId) } : d));
  }

  const c = data?.client;
  const postedCount = data?.videos.filter((v) => v.status === "posted").length ?? 0;

  return (
    <Drawer title={c?.name ?? "Client"} onClose={onClose}>
      {loading || !c ? (
        <p className="py-10 text-center text-sm text-neutral-400">{loading ? "Loading…" : "Not found"}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
              {STATUS_LABELS[c.status]}
            </span>
            <span className="text-sm font-semibold text-neutral-700">
              {money(c.rate, c.currency)} {RATE_PERIOD_LABELS[c.rate_period]}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Videos" value={data.videos.length} />
            <MiniStat label="Posted" value={postedCount} />
            <MiniStat label="Accounts" value={data.accounts.length} />
          </div>

          <div className="flex flex-wrap gap-2">
            {c.email && (
              <a href={`mailto:${c.email}`} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                ✉️ Email
              </a>
            )}
            <button onClick={() => onEdit(c)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
              ✏️ Edit
            </button>
            <button onClick={() => onDelete(c.id)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>

          {c.notes && <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600 whitespace-pre-line">{c.notes}</div>}

          {/* Accounts + credentials */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">Accounts</h3>
              <button onClick={() => setAccEditing(emptyAccount(id))} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                + Add account
              </button>
            </div>
            <div className="space-y-2">
              {data.accounts.map((a) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  onEdit={() =>
                    setAccEditing({
                      id: a.id,
                      client_id: id,
                      platform: a.platform,
                      handle: a.handle ?? "",
                      url: a.url ?? "",
                      login_email: a.login_email ?? "",
                      login_password: a.login_password ?? "",
                      notes: a.notes ?? "",
                    })
                  }
                  onDelete={() => delAcc(a.id)}
                />
              ))}
              {data.accounts.length === 0 && <p className="text-sm text-neutral-400">No accounts yet.</p>}
            </div>
          </div>

          {/* Videos */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">Recent videos</h3>
            <div className="space-y-1.5">
              {data.videos.slice(0, 8).map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-md border border-neutral-100 px-3 py-2 text-sm">
                  <span>{v.platform ? PLATFORM_EMOJI[v.platform] : "🎬"}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-800">{v.title}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${VIDEO_STATUS_COLORS[v.status]}`}>
                    {VIDEO_STATUS_LABELS[v.status]}
                  </span>
                </div>
              ))}
              {data.videos.length === 0 && (
                <p className="text-sm text-neutral-400">No videos yet — add them in the Calendar tab.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {accEditing && (
        <AccountEditor value={accEditing} onChange={setAccEditing} onClose={() => setAccEditing(null)} onSave={saveAcc} />
      )}
    </Drawer>
  );
}

function AccountRow({ account: a, onEdit, onDelete }: { account: UgcAccount; onEdit: () => void; onDelete: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-md border border-neutral-200 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-base">{PLATFORM_EMOJI[a.platform]}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-neutral-900">{PLATFORM_LABELS[a.platform]}</div>
          {a.handle && <div className="truncate text-xs text-neutral-500">{a.handle}</div>}
        </div>
        <button onClick={onEdit} className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
          Edit
        </button>
        <button onClick={onDelete} className="text-xs font-medium text-red-500 hover:text-red-700">
          Delete
        </button>
      </div>
      {(a.login_email || a.login_password) && (
        <div className="mt-2 space-y-1 rounded bg-neutral-50 px-2 py-1.5 text-xs">
          {a.login_email && (
            <CredRow label="Email" value={a.login_email} reveal />
          )}
          {a.login_password && <CredRow label="Password" value={a.login_password} masked={!show} onToggle={() => setShow((s) => !s)} />}
        </div>
      )}
    </div>
  );
}

function CredRow({
  label,
  value,
  masked,
  reveal,
  onToggle,
}: {
  label: string;
  value: string;
  masked?: boolean;
  reveal?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-neutral-400">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-neutral-700">
        {masked ? "••••••••••" : value}
      </span>
      {!reveal && onToggle && (
        <button onClick={onToggle} className="text-neutral-400 hover:text-neutral-700" aria-label="Toggle visibility">
          {masked ? "Show" : "Hide"}
        </button>
      )}
      <button
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`));
        }}
        className="text-neutral-400 hover:text-neutral-700"
      >
        Copy
      </button>
    </div>
  );
}

function AccountEditor({
  value,
  onChange,
  onClose,
  onSave,
}: {
  value: AccountInput;
  onChange: (v: AccountInput) => void;
  onClose: () => void;
  onSave: (v: AccountInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  function set<K extends keyof AccountInput>(k: K, v: AccountInput[K]) {
    onChange({ ...value, [k]: v });
  }
  async function submit() {
    setSaving(true);
    await onSave(value);
    setSaving(false);
  }
  return (
    <Drawer title={value.id ? "Edit account" : "New account"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Platform">
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("platform", p)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  value.platform === p
                    ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                }`}
              >
                <span>{PLATFORM_EMOJI[p]}</span>
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Handle">
          <input className={inputClass} value={value.handle ?? ""} onChange={(e) => set("handle", e.target.value)} placeholder="@username" />
        </Field>
        <Field label="Profile URL">
          <input className={inputClass} value={value.url ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Login email">
          <input className={inputClass} value={value.login_email ?? ""} onChange={(e) => set("login_email", e.target.value)} />
        </Field>
        <Field label="Login password">
          <input className={inputClass} value={value.login_password ?? ""} onChange={(e) => set("login_password", e.target.value)} />
        </Field>
        <p className="text-xs text-neutral-400">
          Credentials are stored in your private admin database. For sensitive accounts, a dedicated password manager is
          safer.
        </p>
        <Field label="Notes">
          <textarea className={inputClass} rows={2} value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900">
          Cancel
        </button>
        <button onClick={submit} disabled={saving} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save account"}
        </button>
      </div>
    </Drawer>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white py-2">
      <div className="text-lg font-bold tabular-nums text-neutral-900">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</div>
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
