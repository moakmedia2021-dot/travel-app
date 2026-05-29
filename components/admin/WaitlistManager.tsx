"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { grantAccess, grantTopN, type WaitlistRow } from "@/app/actions/waitlist";

export default function WaitlistManager({ initial }: { initial: WaitlistRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [grantN, setGrantN] = useState(10);
  const [pending, startTransition] = useTransition();

  async function handleGrant(id: string) {
    startTransition(async () => {
      const r = await grantAccess(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, granted_access: true, access_granted_at: new Date().toISOString() }
            : row
        )
      );
      toast.success("Access email sent");
      router.refresh();
    });
  }

  async function handleBulk() {
    startTransition(async () => {
      const r = await grantTopN(grantN);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Granted ${r.data.granted}`);
      router.refresh();
    });
  }

  const grantedCount = rows.filter((r) => r.granted_access).length;
  const pendingCount = rows.length - grantedCount;

  return (
    <div className="space-y-6">
      {/* Stats + bulk action */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total signups" value={rows.length} />
        <Stat label="Pending" value={pendingCount} />
        <Stat label="Granted" value={grantedCount} />
      </div>

      <div className="flex flex-col items-stretch gap-2 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
        <span className="text-sm font-medium text-neutral-700">Grant top</span>
        <input
          type="number"
          min={1}
          max={500}
          value={grantN}
          onChange={(e) => setGrantN(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
          className="h-10 w-20 rounded-md border border-neutral-300 bg-white px-2 text-center text-sm font-mono shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
        <button
          onClick={handleBulk}
          disabled={pending}
          className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? "Granting…" : "Grant access"}
        </button>
        <span className="text-xs text-neutral-500">
          Processes pending signups by position. Each sends a magic-link email.
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <Th>Pos</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th className="text-right">Refs</Th>
              <Th>Joined</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-neutral-50/50">
                <Td className="font-mono tabular-nums text-neutral-500">{r.position}</Td>
                <Td>{r.name || <span className="text-neutral-300">—</span>}</Td>
                <Td className="font-mono text-neutral-600">{r.email}</Td>
                <Td className="text-right tabular-nums">{r.referrals_count}</Td>
                <Td className="text-neutral-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </Td>
                <Td>
                  {r.granted_access ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Granted
                    </span>
                  ) : (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                      Pending
                    </span>
                  )}
                </Td>
                <Td className="text-right">
                  {!r.granted_access && (
                    <button
                      onClick={() => handleGrant(r.id)}
                      disabled={pending}
                      className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                    >
                      Grant
                    </button>
                  )}
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-neutral-400">
                  No signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-2 ${className}`}>{children}</td>;
}
