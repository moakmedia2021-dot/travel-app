export type FinanceKind = "income" | "expense";
export type FinanceScope = "personal" | "business";
export type ScopeFilter = "all" | FinanceScope;

export type AccountType =
  | "cash"
  | "checking"
  | "savings"
  | "credit"
  | "investment"
  | "other";

export type FinanceAccount = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  starting_balance: number;
  color: string | null;
  archived: boolean;
  created_at: string;
};

export type FinanceCategory = {
  id: string;
  name: string;
  kind: FinanceKind;
  color: string;
  sort: number;
  created_at: string;
};

export type FinanceTransaction = {
  id: string;
  occurred_on: string; // YYYY-MM-DD
  amount: number;
  kind: FinanceKind;
  scope: FinanceScope;
  category_id: string | null;
  account_id: string | null;
  merchant: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceBudget = {
  id: string;
  month: string; // YYYY-MM-DD (first of month)
  scope: FinanceScope;
  category_id: string;
  amount: number;
};

// Transaction enriched with category + account display info (joined in JS).
export type EnrichedTransaction = FinanceTransaction & {
  category_name: string | null;
  category_color: string | null;
  account_name: string | null;
};

export type AccountBalance = { account_id: string; balance: number };

export type MonthlyTotal = { month: string; income: number; expense: number };

export type CategoryBreakdownRow = {
  category_id: string | null;
  name: string;
  color: string;
  spent: number;
};

export type BudgetRow = {
  category_id: string;
  name: string;
  color: string;
  budget: number;
  spent: number;
};

// Input shape shared by the slide-over form and the upsert action.
export type TransactionInput = {
  id?: string | null;
  occurred_on: string;
  amount: number;
  kind: FinanceKind;
  scope: FinanceScope;
  category_id: string | null;
  account_id: string | null;
  merchant: string | null;
  note: string | null;
};

export type AccountInput = {
  id?: string | null;
  name: string;
  type: AccountType;
  currency: string;
  starting_balance: number;
  color: string | null;
  archived: boolean;
};

export type CategoryInput = {
  id?: string | null;
  name: string;
  kind: FinanceKind;
  color: string;
  sort: number;
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  checking: "Checking",
  savings: "Savings",
  credit: "Credit card",
  investment: "Investment",
  other: "Other",
};

// A friendly palette for new categories / accounts.
export const FINANCE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#e11d48",
  "#9333ea",
  "#dc2626",
  "#0d9488",
  "#f59e0b",
  "#3b82f6",
  "#65a30d",
  "#737373",
];
