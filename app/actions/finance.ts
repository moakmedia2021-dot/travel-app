"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import type {
  AccountInput,
  CategoryInput,
  FinanceScope,
  TransactionInput,
} from "@/lib/finance/types";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const PATH = "/admin/finance";

// Every mutation runs through here: confirms the caller is the admin and
// returns an authenticated Supabase client. The RPCs themselves are also
// scoped to auth.uid(), so this is defense-in-depth.
async function adminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user?.id)) return { supabase: null, user: null };
  return { supabase, user };
}

export async function seedFinanceDefaults(): Promise<Result> {
  const { supabase } = await adminClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  const { error } = await supabase.rpc("finance_seed_defaults");
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

// ----- Transactions -----------------------------------------------------
export async function saveTransaction(input: TransactionInput): Promise<Result<string>> {
  const { supabase } = await adminClient();
  if (!supabase) return { ok: false, error: "forbidden" };

  const { data, error } = await supabase.rpc("finance_upsert_transaction", {
    p_id: input.id ?? null,
    p_occurred_on: input.occurred_on,
    p_amount: input.amount,
    p_kind: input.kind,
    p_scope: input.scope,
    p_category_id: input.category_id,
    p_account_id: input.account_id,
    p_merchant: input.merchant,
    p_note: input.note,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, data: data as string };
}

export async function deleteTransaction(id: string): Promise<Result> {
  const { supabase } = await adminClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  const { error } = await supabase.rpc("finance_delete_transaction", { p_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

// ----- Accounts ---------------------------------------------------------
export async function saveAccount(input: AccountInput): Promise<Result<string>> {
  const { supabase } = await adminClient();
  if (!supabase) return { ok: false, error: "forbidden" };

  const { data, error } = await supabase.rpc("finance_upsert_account", {
    p_id: input.id ?? null,
    p_name: input.name,
    p_type: input.type,
    p_currency: input.currency,
    p_starting_balance: input.starting_balance,
    p_color: input.color,
    p_archived: input.archived,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, data: data as string };
}

export async function deleteAccount(id: string): Promise<Result> {
  const { supabase } = await adminClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  const { error } = await supabase.rpc("finance_delete_account", { p_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

// ----- Categories -------------------------------------------------------
export async function saveCategory(input: CategoryInput): Promise<Result<string>> {
  const { supabase } = await adminClient();
  if (!supabase) return { ok: false, error: "forbidden" };

  const { data, error } = await supabase.rpc("finance_upsert_category", {
    p_id: input.id ?? null,
    p_name: input.name,
    p_kind: input.kind,
    p_color: input.color,
    p_sort: input.sort,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, data: data as string };
}

export async function deleteCategory(id: string): Promise<Result> {
  const { supabase } = await adminClient();
  if (!supabase) return { ok: false, error: "forbidden" };
  const { error } = await supabase.rpc("finance_delete_category", { p_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

// ----- Budgets ----------------------------------------------------------
export async function setBudget(args: {
  month: string;
  scope: FinanceScope;
  categoryId: string;
  amount: number;
}): Promise<Result> {
  const { supabase } = await adminClient();
  if (!supabase) return { ok: false, error: "forbidden" };

  const { error } = await supabase.rpc("finance_set_budget", {
    p_month: args.month,
    p_scope: args.scope,
    p_category_id: args.categoryId,
    p_amount: args.amount,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}
