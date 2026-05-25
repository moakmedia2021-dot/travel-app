"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SplitType } from "@/lib/types";

export type ExpenseInput = {
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  paid_by: string;
  split_type: SplitType;
  splits: { user_id: string; amount_owed: number }[];
};

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export async function createExpense(
  tripId: string,
  input: ExpenseInput
): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_expense", {
    p_trip_id: tripId,
    p_title: input.title.trim(),
    p_amount: input.amount,
    p_currency: input.currency,
    p_category: input.category,
    p_date: input.date,
    p_paid_by: input.paid_by,
    p_split_type: input.split_type,
    p_split_user_ids: input.splits.map((s) => s.user_id),
    p_split_amounts: input.splits.map((s) => s.amount_owed),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}/budget`);
  return { ok: true, data: data as string };
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  input: ExpenseInput
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_expense", {
    p_id: expenseId,
    p_title: input.title.trim(),
    p_amount: input.amount,
    p_currency: input.currency,
    p_category: input.category,
    p_date: input.date,
    p_paid_by: input.paid_by,
    p_split_type: input.split_type,
    p_split_user_ids: input.splits.map((s) => s.user_id),
    p_split_amounts: input.splits.map((s) => s.amount_owed),
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}/budget`);
  return { ok: true };
}

export async function deleteExpense(
  tripId: string,
  expenseId: string
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_expense", { p_id: expenseId });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}/budget`);
  return { ok: true };
}

export async function toggleSplitSettled(
  tripId: string,
  splitId: string,
  settled: boolean
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_split_settled", {
    p_split_id: splitId,
    p_settled: settled,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}/budget`);
  return { ok: true };
}
