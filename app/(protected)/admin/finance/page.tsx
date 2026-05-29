import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { isAdminUnlocked, lockAdminPortal } from "@/app/actions/admin";
import PasswordGate from "@/components/admin/PasswordGate";
import AdminNav from "@/components/admin/AdminNav";
import FinanceHub from "@/components/admin/finance/FinanceHub";
import {
  addMonths,
  monthKey,
  monthStartISO,
  parseMonth,
} from "@/lib/finance/format";
import type {
  AccountBalance,
  BudgetRow,
  CategoryBreakdownRow,
  EnrichedTransaction,
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  FinanceTransaction,
  MonthlyTotal,
  ScopeFilter,
} from "@/lib/finance/types";

export const dynamic = "force-dynamic";

function normalizeScope(v: string | undefined): ScopeFilter {
  return v === "personal" || v === "business" ? v : "all";
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; scope?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user?.id)) notFound();

  if (!(await isAdminUnlocked())) {
    return <PasswordGate />;
  }

  const sp = await searchParams;
  const scope = normalizeScope(sp.scope);
  const monthDate = parseMonth(sp.month);
  const startISO = monthStartISO(monthDate);
  const nextISO = monthStartISO(addMonths(monthDate, 1));

  // --- Categories + accounts (seed defaults on first ever visit) ---------
  let [{ data: catData }, { data: acctData }] = await Promise.all([
    supabase.from("finance_categories").select("*").order("kind").order("sort").order("name"),
    supabase.from("finance_accounts").select("*").order("archived").order("name"),
  ]);

  if (!catData || catData.length === 0) {
    await supabase.rpc("finance_seed_defaults");
    [{ data: catData }, { data: acctData }] = await Promise.all([
      supabase.from("finance_categories").select("*").order("kind").order("sort").order("name"),
      supabase.from("finance_accounts").select("*").order("archived").order("name"),
    ]);
  }

  const categories = (catData ?? []) as FinanceCategory[];
  const accounts = (acctData ?? []) as FinanceAccount[];

  // --- Month transactions, budgets, balances, trend --------------------
  let txQuery = supabase
    .from("finance_transactions")
    .select("*")
    .gte("occurred_on", startISO)
    .lt("occurred_on", nextISO)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (scope !== "all") txQuery = txQuery.eq("scope", scope);

  let budgetQuery = supabase.from("finance_budgets").select("*").eq("month", startISO);
  if (scope !== "all") budgetQuery = budgetQuery.eq("scope", scope);

  const [txRes, budgetRes, balRes, trendRes] = await Promise.all([
    txQuery,
    budgetQuery,
    supabase.rpc("finance_account_balances"),
    supabase.rpc("finance_monthly_totals", { p_months: 6, p_scope: scope }),
  ]);

  const rawTx = (txRes.data ?? []) as FinanceTransaction[];
  const budgets = (budgetRes.data ?? []) as FinanceBudget[];
  const balances = (balRes.data ?? []) as AccountBalance[];
  const trend = ((trendRes.data ?? []) as MonthlyTotal[]).map((t) => ({
    month: typeof t.month === "string" ? t.month.slice(0, 7) : t.month,
    income: Number(t.income) || 0,
    expense: Number(t.expense) || 0,
  }));

  // --- Enrich + aggregate ----------------------------------------------
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const acctMap = new Map(accounts.map((a) => [a.id, a]));

  const transactions: EnrichedTransaction[] = rawTx.map((t) => {
    const cat = t.category_id ? catMap.get(t.category_id) : null;
    return {
      ...t,
      amount: Number(t.amount) || 0,
      category_name: cat?.name ?? null,
      category_color: cat?.color ?? null,
      account_name: t.account_id ? acctMap.get(t.account_id)?.name ?? null : null,
    };
  });

  let income = 0;
  let expense = 0;
  const spentByCat = new Map<string | null, number>();
  for (const t of transactions) {
    if (t.kind === "income") {
      income += t.amount;
    } else {
      expense += t.amount;
      spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + t.amount);
    }
  }
  const summary = { income, expense, net: income - expense };

  const categoryBreakdown: CategoryBreakdownRow[] = [...spentByCat.entries()]
    .map(([id, spent]) => {
      const cat = id ? catMap.get(id) : null;
      return {
        category_id: id,
        name: cat?.name ?? "Uncategorized",
        color: cat?.color ?? "#a3a3a3",
        spent,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  // Budget rows: collapse multiple scope rows per category into one when "all".
  const budgetByCat = new Map<string, number>();
  for (const b of budgets) {
    budgetByCat.set(b.category_id, (budgetByCat.get(b.category_id) ?? 0) + Number(b.amount));
  }
  const budgetRows: BudgetRow[] = [...budgetByCat.entries()]
    .map(([categoryId, budget]) => {
      const cat = catMap.get(categoryId);
      return {
        category_id: categoryId,
        name: cat?.name ?? "Unknown",
        color: cat?.color ?? "#a3a3a3",
        budget,
        spent: spentByCat.get(categoryId) ?? 0,
      };
    })
    .sort((a, b) => b.spent / (b.budget || 1) - a.spent / (a.budget || 1));

  const accountBalances = accounts.map((a) => ({
    account: a,
    balance: Number(balances.find((b) => b.account_id === a.id)?.balance ?? a.starting_balance),
  }));
  const netWorth = accountBalances
    .filter((a) => !a.account.archived)
    .reduce((s, a) => s + a.balance, 0);

  const baseCurrency = accounts[0]?.currency || "USD";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">Internal admin tools.</p>
        </div>
        <form action={lockAdminPortal}>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            title="Re-lock the portal"
          >
            🔒 Lock
          </button>
        </form>
      </div>

      <AdminNav />

      <FinanceHub
        monthKey={monthKey(monthDate)}
        scope={scope}
        baseCurrency={baseCurrency}
        accounts={accounts}
        categories={categories}
        transactions={transactions}
        summary={summary}
        categoryBreakdown={categoryBreakdown}
        budgetRows={budgetRows}
        accountBalances={accountBalances}
        netWorth={netWorth}
        monthlyTotals={trend}
      />
    </div>
  );
}
