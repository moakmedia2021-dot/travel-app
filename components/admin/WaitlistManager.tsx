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

      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-700">Grant top</span>
          <input
            type="number"
            min={1}
            max={500}
            value={grantN}
            onChange={(e) =>
              setGrantN(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
            }
            className="h-11 w-20 rounded-md border border-neutral-300 bg-white px-2 text-center text-sm font-mono shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
          <button
            onClick={handleBulk}
            disabled={pending}
            className="h-11 flex-1 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 sm:flex-none"
          >
            {pending ? "Granting…" : "Grant access"}
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Processes pending signups by position. Each sends a magic-link email.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-400">
          No signups yet.
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-2 md:hidden">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-neutral-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs tabular-nums text-neutral-400">
                        #{r.position}
                      </span>
                      <span className="truncate text-sm font-medium text-neutral-900">
                        {r.name || <span className="text-neutral-300">no name</span>}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs text-neutral-500">
                      {r.email}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-500">
                      <span className="tabular-nums">{r.referrals_count} refs</span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      {r.granted_access ? (
                        <span className="rounded-full bg-green-100 px-1.5 py-0.5 font-medium text-green-700">
                          Granted
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-700">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  {!r.granted_access && (
                    <button
                      onClick={() => handleGrant(r.id)}
                      disabled={pending}
                      className="h-10 shrink-0 rounded-md bg-neutral-900 px-3 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
                    >
                      Grant
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white md:block">
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
              </tbody>
            </table>
          </div>
        </>
      )}
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
