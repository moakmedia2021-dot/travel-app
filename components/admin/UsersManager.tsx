"use client";

import { useMemo, useRef, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  verifyUserEmail,
  setUserPremium,
  setUserBanned,
  type AdminUser,
  type PremiumPlan,
} from "@/app/actions/adminUsers";
import { grantAdmin, revokeAdmin } from "@/app/actions/admin";

export default function UsersManager({ initial }: { initial: AdminUser[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "premium" | "unverified" | "banned" | "admins">("all");
  const [pending, startTransition] = useTransition();
  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);

  useEffect(() => setRows(initial), [initial]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      verified: rows.filter((r) => r.email_verified).length,
      premium: rows.filter((r) => r.is_premium).length,
      admins: rows.filter((r) => r.is_admin).length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "premium" && !r.is_premium) return false;
      if (filter === "unverified" && r.email_verified) return false;
      if (filter === "banned" && !r.banned) return false;
      if (filter === "admins" && !r.is_admin) return false;
      if (!q) return true;
      return [r.full_name, r.username, r.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [rows, search, filter]);

  function patch(id: string, next: Partial<AdminUser>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }

  function runVerify(u: AdminUser) {
    startTransition(async () => {
      const r = await verifyUserEmail(u.id);
      if (!r.ok) return void toast.error(r.error);
      patch(u.id, { email_verified: true });
      toast.success("Account verified");
      router.refresh();
    });
  }

  function runPremium(u: AdminUser, plan: PremiumPlan) {
    startTransition(async () => {
      const r = await setUserPremium(u.id, plan);
      if (!r.ok) return void toast.error(r.error);
      patch(u.id, {
        is_premium: plan !== "revoke",
        subscription_status: plan === "revoke" ? "free" : "premium",
      });
      toast.success(plan === "revoke" ? "Premium revoked" : "Premium granted");
      router.refresh();
    });
  }

  function runBan(u: AdminUser, banned: boolean) {
    if (banned && !confirm(`Ban ${u.full_name || u.email || "this user"}? They won't be able to sign in.`))
      return;
    startTransition(async () => {
      const r = await setUserBanned(u.id, banned);
      if (!r.ok) return void toast.error(r.error);
      patch(u.id, { banned });
      toast.success(banned ? "User banned" : "User unbanned");
      router.refresh();
    });
  }

  // Granting admin requires the portal password — handled via a modal.
  async function submitGrant(password: string): Promise<string | null> {
    if (!grantTarget) return "No user";
    const r = await grantAdmin(grantTarget.id, password);
    if (!r.ok) return r.error;
    patch(grantTarget.id, { is_admin: true });
    toast.success("Admin access granted");
    setGrantTarget(null);
    router.refresh();
    return null;
  }

  function runRevokeAdmin(u: AdminUser) {
    if (!confirm(`Revoke admin access for ${u.full_name || u.email || "this user"}?`)) return;
    startTransition(async () => {
      const r = await revokeAdmin(u.id);
      if (!r.ok) return void toast.error(r.error);
      patch(u.id, { is_admin: false });
      toast.success("Admin access revoked");
      router.refresh();
    });
  }

  const filters: { value: typeof filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "premium", label: "Premium" },
    { value: "unverified", label: "Unverified" },
    { value: "banned", label: "Banned" },
    { value: "admins", label: "Admins" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total users" value={stats.total} />
        <Stat label="Verified" value={stats.verified} />
        <Stat label="Premium" value={stats.premium} />
        <Stat label="Admins" value={stats.admins} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, username, email…"
          className="h-10 min-w-[14rem] flex-1 rounded-md border border-neutral-300 bg-white px-3 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
        <div className="flex rounded-md border border-neutral-300 p-0.5">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-400">
          No users match.
        </div>
      ) : (
        <div className="overflow-visible rounded-xl border border-neutral-200 bg-white">
          <div className="divide-y divide-neutral-100">
            {visible.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                pending={pending}
                onVerify={() => runVerify(u)}
                onPremium={(plan) => runPremium(u, plan)}
                onBan={(b) => runBan(u, b)}
                onGrantAdmin={() => setGrantTarget(u)}
                onRevokeAdmin={() => runRevokeAdmin(u)}
              />
            ))}
          </div>
        </div>
      )}

      {grantTarget && (
        <GrantAdminModal
          user={grantTarget}
          onClose={() => setGrantTarget(null)}
          onSubmit={submitGrant}
        />
      )}
    </div>
  );
}

function UserRow({
  user: u,
  pending,
  onVerify,
  onPremium,
  onBan,
  onGrantAdmin,
  onRevokeAdmin,
}: {
  user: AdminUser;
  pending: boolean;
  onVerify: () => void;
  onPremium: (plan: PremiumPlan) => void;
  onBan: (banned: boolean) => void;
  onGrantAdmin: () => void;
  onRevokeAdmin: () => void;
}) {
  const initial = (u.full_name || u.username || u.email || "?").charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3 px-3 py-3 hover:bg-neutral-50/60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600">
        {u.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium text-neutral-900">
            {u.full_name || u.username || <span className="text-neutral-300">no name</span>}
          </span>
          {u.username && <span className="text-xs text-neutral-400">@{u.username}</span>}
          {u.is_admin && (
            <Badge tone="violet">{u.is_env_admin ? "Root admin" : "Admin"}</Badge>
          )}
          {u.is_premium && <Badge tone="amber">Premium</Badge>}
          {!u.email_verified && <Badge tone="neutral">Unverified</Badge>}
          {u.banned && <Badge tone="red">Banned</Badge>}
          {u.deleted && <Badge tone="neutral">Deleted</Badge>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
          <span className="truncate font-mono">{u.email ?? "—"}</span>
          <span>·</span>
          <span>joined {new Date(u.created_at).toLocaleDateString()}</span>
          {u.last_sign_in_at && (
            <>
              <span>·</span>
              <span>last seen {new Date(u.last_sign_in_at).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>

      <ActionsMenu
        user={u}
        pending={pending}
        onVerify={onVerify}
        onPremium={onPremium}
        onBan={onBan}
        onGrantAdmin={onGrantAdmin}
        onRevokeAdmin={onRevokeAdmin}
      />
    </div>
  );
}

function ActionsMenu({
  user: u,
  pending,
  onVerify,
  onPremium,
  onBan,
  onGrantAdmin,
  onRevokeAdmin,
}: {
  user: AdminUser;
  pending: boolean;
  onVerify: () => void;
  onPremium: (plan: PremiumPlan) => void;
  onBan: (banned: boolean) => void;
  onGrantAdmin: () => void;
  onRevokeAdmin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
        aria-label="Manage user"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          {!u.email_verified && (
            <MenuItem onClick={() => pick(onVerify)}>✓ Verify account</MenuItem>
          )}
          <MenuLabel>Premium</MenuLabel>
          <MenuItem onClick={() => pick(() => onPremium("month"))}>Grant 1 month</MenuItem>
          <MenuItem onClick={() => pick(() => onPremium("year"))}>Grant 1 year</MenuItem>
          <MenuItem onClick={() => pick(() => onPremium("lifetime"))}>Grant lifetime</MenuItem>
          {u.is_premium && (
            <MenuItem danger onClick={() => pick(() => onPremium("revoke"))}>
              Revoke premium
            </MenuItem>
          )}
          <div className="my-1 border-t border-neutral-100" />
          <MenuLabel>Access</MenuLabel>
          {u.is_env_admin ? (
            <div className="px-3 py-2 text-sm text-neutral-400">Root admin (env)</div>
          ) : u.is_admin ? (
            <MenuItem danger onClick={() => pick(onRevokeAdmin)}>
              Revoke admin
            </MenuItem>
          ) : (
            <MenuItem onClick={() => pick(onGrantAdmin)}>🔑 Make admin…</MenuItem>
          )}
          <div className="my-1 border-t border-neutral-100" />
          {u.banned ? (
            <MenuItem onClick={() => pick(() => onBan(false))}>Unban user</MenuItem>
          ) : (
            <MenuItem danger onClick={() => pick(() => onBan(true))}>
              Ban user
            </MenuItem>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
        danger ? "text-red-600" : "text-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
      {children}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "amber" | "red" | "neutral" | "violet";
}) {
  const cls =
    tone === "amber"
      ? "bg-amber-100 text-amber-700"
      : tone === "red"
      ? "bg-red-100 text-red-700"
      : tone === "violet"
      ? "bg-violet-100 text-violet-700"
      : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>
  );
}

function GrantAdminModal({
  user,
  onClose,
  onSubmit,
}: {
  user: AdminUser;
  onClose: () => void;
  onSubmit: (password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!password) {
      setError("Enter the admin password");
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit(password);
    if (err) {
      setError(err);
      setBusy(false);
    }
  }

  const name = user.full_name || user.username || user.email || "this user";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" aria-modal>
      <div className="absolute inset-0 bg-neutral-900/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-base font-semibold text-neutral-900">Grant admin access</h2>
        <p className="mt-1 text-sm text-neutral-500">
          This gives <span className="font-medium text-neutral-700">{name}</span> full access to the
          admin portal. Enter the admin password to confirm.
        </p>
        <input
          type="password"
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Admin password"
          className="mt-4 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !password}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {busy ? "Granting…" : "Grant admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
