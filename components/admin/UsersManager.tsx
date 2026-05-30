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

export default function UsersManager({ initial }: { initial: AdminUser[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "premium" | "unverified" | "banned">("all");
  const [pending, startTransition] = useTransition();

  useEffect(() => setRows(initial), [initial]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      verified: rows.filter((r) => r.email_verified).length,
      premium: rows.filter((r) => r.is_premium).length,
      banned: rows.filter((r) => r.banned).length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "premium" && !r.is_premium) return false;
      if (filter === "unverified" && r.email_verified) return false;
      if (filter === "banned" && !r.banned) return false;
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

  const filters: { value: typeof filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "premium", label: "Premium" },
    { value: "unverified", label: "Unverified" },
    { value: "banned", label: "Banned" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total users" value={stats.total} />
        <Stat label="Verified" value={stats.verified} />
        <Stat label="Premium" value={stats.premium} />
        <Stat label="Banned" value={stats.banned} />
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
              />
            ))}
          </div>
        </div>
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
}: {
  user: AdminUser;
  pending: boolean;
  onVerify: () => void;
  onPremium: (plan: PremiumPlan) => void;
  onBan: (banned: boolean) => void;
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
}: {
  user: AdminUser;
  pending: boolean;
  onVerify: () => void;
  onPremium: (plan: PremiumPlan) => void;
  onBan: (banned: boolean) => void;
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

function Badge({ children, tone }: { children: React.ReactNode; tone: "amber" | "red" | "neutral" }) {
  const cls =
    tone === "amber"
      ? "bg-amber-100 text-amber-700"
      : tone === "red"
      ? "bg-red-100 text-red-700"
      : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>
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
