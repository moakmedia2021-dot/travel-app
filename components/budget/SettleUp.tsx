import type { Expense, TripMember } from "@/lib/types";
import { formatMoney } from "@/lib/currencies";
import { MemberAvatar, memberDisplayName, findMember } from "./MemberAvatar";

type Props = {
  members: TripMember[];
  expenses: Expense[];
  currency: string;
};

type Transaction = { from: string; to: string; amount: number };

function settleUp(
  members: TripMember[],
  expenses: Expense[]
): { balances: Map<string, number>; transactions: Transaction[] } {
  const balances = new Map<string, number>(members.map((m) => [m.user_id, 0]));

  for (const exp of expenses) {
    balances.set(
      exp.paid_by,
      (balances.get(exp.paid_by) ?? 0) + Number(exp.amount)
    );
    for (const split of exp.expense_splits) {
      balances.set(
        split.user_id,
        (balances.get(split.user_id) ?? 0) - Number(split.amount_owed)
      );
    }
  }

  // Greedy min-transactions settlement
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];
  Array.from(balances.entries()).forEach(([id, bal]) => {
    if (bal > 0.01) creditors.push({ id, amount: bal });
    else if (bal < -0.01) debtors.push({ id, amount: -bal });
  });
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    transactions.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return { balances, transactions };
}

export default function SettleUp({ members, expenses, currency }: Props) {
  if (members.length < 2) return null;

  const { balances, transactions } = settleUp(members, expenses);
  const allZero = Array.from(balances.values()).every((v) => Math.abs(v) < 0.01);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-neutral-900">Settle up</h3>

      {allZero ? (
        <p className="mt-2 text-sm text-neutral-500">
          Everyone's even. Nothing to settle.
        </p>
      ) : (
        <>
          <div className="mt-3 space-y-1.5">
            {members.map((m) => {
              const bal = balances.get(m.user_id) ?? 0;
              const sign = bal > 0.01 ? "owed" : bal < -0.01 ? "owes" : "even";
              return (
                <div key={m.user_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MemberAvatar profile={m.profile} size={20} />
                    <span className="text-neutral-700">{memberDisplayName(m.profile)}</span>
                  </div>
                  <span
                    className={`tabular-nums font-medium ${
                      sign === "owed"
                        ? "text-green-700"
                        : sign === "owes"
                          ? "text-red-700"
                          : "text-neutral-400"
                    }`}
                  >
                    {sign === "even"
                      ? "—"
                      : sign === "owed"
                        ? `+${formatMoney(bal, currency)}`
                        : `-${formatMoney(-bal, currency)}`}
                  </span>
                </div>
              );
            })}
          </div>

          {transactions.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-neutral-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Suggested transfers
              </p>
              {transactions.map((t, idx) => {
                const from = findMember(members, t.from);
                const to = findMember(members, t.to);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <MemberAvatar profile={from?.profile} size={20} />
                    <span className="text-neutral-700">
                      {memberDisplayName(from?.profile)}
                    </span>
                    <svg className="h-3 w-3 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <MemberAvatar profile={to?.profile} size={20} />
                    <span className="text-neutral-700">
                      {memberDisplayName(to?.profile)}
                    </span>
                    <span className="ml-auto font-medium tabular-nums text-neutral-900">
                      {formatMoney(t.amount, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
