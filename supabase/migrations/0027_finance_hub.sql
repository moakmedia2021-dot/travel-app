-- =====================================================================
-- Personal + business finance hub (admin-only, scoped per user)
--   * accounts, categories, transactions, monthly budgets
--   * RLS: each row readable only by its owner (user_id = auth.uid())
--   * All writes go through SECURITY DEFINER RPCs (consistent with the
--     rest of this app, which avoids the platform WITH CHECK quirk).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.finance_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  type              text not null default 'checking'
                      check (type in ('cash','checking','savings','credit','investment','other')),
  currency          text not null default 'USD',
  starting_balance  numeric(14,2) not null default 0,
  color             text,
  archived          boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists idx_finance_accounts_user on public.finance_accounts (user_id);

create table if not exists public.finance_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('income','expense')),
  color       text not null default '#737373',
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name, kind)
);
create index if not exists idx_finance_categories_user on public.finance_categories (user_id);

create table if not exists public.finance_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  occurred_on  date not null default current_date,
  amount       numeric(14,2) not null check (amount > 0),
  kind         text not null check (kind in ('income','expense')),
  scope        text not null default 'personal' check (scope in ('personal','business')),
  category_id  uuid references public.finance_categories(id) on delete set null,
  account_id   uuid references public.finance_accounts(id) on delete set null,
  merchant     text,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_finance_tx_user_date on public.finance_transactions (user_id, occurred_on desc);
create index if not exists idx_finance_tx_account   on public.finance_transactions (account_id);
create index if not exists idx_finance_tx_category  on public.finance_transactions (category_id);

create table if not exists public.finance_budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  month        date not null,            -- always stored as the first of the month
  scope        text not null default 'personal' check (scope in ('personal','business')),
  category_id  uuid not null references public.finance_categories(id) on delete cascade,
  amount       numeric(14,2) not null check (amount >= 0),
  created_at   timestamptz not null default now(),
  unique (user_id, month, scope, category_id)
);
create index if not exists idx_finance_budgets_user_month on public.finance_budgets (user_id, month);

-- ---------------------------------------------------------------------
-- RLS: owner-only reads. Writes happen via SECURITY DEFINER RPCs.
-- ---------------------------------------------------------------------
alter table public.finance_accounts     enable row level security;
alter table public.finance_categories   enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_budgets      enable row level security;

drop policy if exists "finance_accounts: owner read" on public.finance_accounts;
create policy "finance_accounts: owner read" on public.finance_accounts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "finance_categories: owner read" on public.finance_categories;
create policy "finance_categories: owner read" on public.finance_categories
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "finance_transactions: owner read" on public.finance_transactions;
create policy "finance_transactions: owner read" on public.finance_transactions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "finance_budgets: owner read" on public.finance_budgets;
create policy "finance_budgets: owner read" on public.finance_budgets
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------
create or replace function public.finance_upsert_account(
  p_id               uuid,
  p_name             text,
  p_type             text,
  p_currency         text,
  p_starting_balance numeric,
  p_color            text,
  p_archived         boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name is required'; end if;
  if p_type not in ('cash','checking','savings','credit','investment','other') then
    raise exception 'invalid account type';
  end if;

  if p_id is null then
    insert into public.finance_accounts
      (user_id, name, type, currency, starting_balance, color, archived)
    values
      (v_user, trim(p_name), p_type, coalesce(nullif(trim(p_currency),''),'USD'),
       coalesce(p_starting_balance, 0), nullif(trim(p_color),''), coalesce(p_archived, false))
    returning id into v_id;
  else
    update public.finance_accounts
      set name = trim(p_name),
          type = p_type,
          currency = coalesce(nullif(trim(p_currency),''),'USD'),
          starting_balance = coalesce(p_starting_balance, 0),
          color = nullif(trim(p_color),''),
          archived = coalesce(p_archived, false)
      where id = p_id and user_id = v_user
      returning id into v_id;
    if v_id is null then raise exception 'not found'; end if;
  end if;

  return v_id;
end $$;
grant execute on function public.finance_upsert_account(uuid, text, text, text, numeric, text, boolean) to authenticated;

create or replace function public.finance_delete_account(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  delete from public.finance_accounts where id = p_id and user_id = v_user;
end $$;
grant execute on function public.finance_delete_account(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------
create or replace function public.finance_upsert_category(
  p_id    uuid,
  p_name  text,
  p_kind  text,
  p_color text,
  p_sort  int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name is required'; end if;
  if p_kind not in ('income','expense') then raise exception 'invalid kind'; end if;

  if p_id is null then
    insert into public.finance_categories (user_id, name, kind, color, sort)
    values (v_user, trim(p_name), p_kind, coalesce(nullif(trim(p_color),''),'#737373'), coalesce(p_sort,0))
    returning id into v_id;
  else
    update public.finance_categories
      set name = trim(p_name),
          kind = p_kind,
          color = coalesce(nullif(trim(p_color),''),'#737373'),
          sort = coalesce(p_sort,0)
      where id = p_id and user_id = v_user
      returning id into v_id;
    if v_id is null then raise exception 'not found'; end if;
  end if;

  return v_id;
end $$;
grant execute on function public.finance_upsert_category(uuid, text, text, text, int) to authenticated;

create or replace function public.finance_delete_category(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  -- transactions keep their history (category set null via FK);
  -- budgets for this category are removed (cascade via FK).
  delete from public.finance_categories where id = p_id and user_id = v_user;
end $$;
grant execute on function public.finance_delete_category(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------
create or replace function public.finance_upsert_transaction(
  p_id          uuid,
  p_occurred_on date,
  p_amount      numeric,
  p_kind        text,
  p_scope       text,
  p_category_id uuid,
  p_account_id  uuid,
  p_merchant    text,
  p_note        text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('income','expense') then raise exception 'invalid kind'; end if;
  if p_scope not in ('personal','business') then raise exception 'invalid scope'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be greater than 0'; end if;

  if p_category_id is not null and not exists (
    select 1 from public.finance_categories where id = p_category_id and user_id = v_user
  ) then raise exception 'invalid category'; end if;

  if p_account_id is not null and not exists (
    select 1 from public.finance_accounts where id = p_account_id and user_id = v_user
  ) then raise exception 'invalid account'; end if;

  if p_id is null then
    insert into public.finance_transactions
      (user_id, occurred_on, amount, kind, scope, category_id, account_id, merchant, note)
    values
      (v_user, coalesce(p_occurred_on, current_date), p_amount, p_kind, p_scope,
       p_category_id, p_account_id, nullif(trim(p_merchant),''), nullif(trim(p_note),''))
    returning id into v_id;
  else
    update public.finance_transactions
      set occurred_on = coalesce(p_occurred_on, occurred_on),
          amount = p_amount,
          kind = p_kind,
          scope = p_scope,
          category_id = p_category_id,
          account_id = p_account_id,
          merchant = nullif(trim(p_merchant),''),
          note = nullif(trim(p_note),''),
          updated_at = now()
      where id = p_id and user_id = v_user
      returning id into v_id;
    if v_id is null then raise exception 'not found'; end if;
  end if;

  return v_id;
end $$;
grant execute on function public.finance_upsert_transaction(uuid, date, numeric, text, text, uuid, uuid, text, text) to authenticated;

create or replace function public.finance_delete_transaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  delete from public.finance_transactions where id = p_id and user_id = v_user;
end $$;
grant execute on function public.finance_delete_transaction(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Budgets (monthly, per category + scope)
-- ---------------------------------------------------------------------
create or replace function public.finance_set_budget(
  p_month       date,
  p_scope       text,
  p_category_id uuid,
  p_amount      numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_month date := date_trunc('month', coalesce(p_month, current_date))::date;
  v_id    uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_scope not in ('personal','business') then raise exception 'invalid scope'; end if;
  if p_amount is null or p_amount < 0 then raise exception 'invalid amount'; end if;
  if not exists (
    select 1 from public.finance_categories where id = p_category_id and user_id = v_user
  ) then raise exception 'invalid category'; end if;

  -- amount of 0 clears the budget for that slot
  if p_amount = 0 then
    delete from public.finance_budgets
      where user_id = v_user and month = v_month and scope = p_scope and category_id = p_category_id;
    return null;
  end if;

  insert into public.finance_budgets (user_id, month, scope, category_id, amount)
  values (v_user, v_month, p_scope, p_category_id, p_amount)
  on conflict (user_id, month, scope, category_id)
  do update set amount = excluded.amount
  returning id into v_id;

  return v_id;
end $$;
grant execute on function public.finance_set_budget(date, text, uuid, numeric) to authenticated;

create or replace function public.finance_delete_budget(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  delete from public.finance_budgets where id = p_id and user_id = v_user;
end $$;
grant execute on function public.finance_delete_budget(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Aggregates (read helpers)
-- ---------------------------------------------------------------------
-- Current balance per account = starting_balance + income - expense.
create or replace function public.finance_account_balances()
returns table (account_id uuid, balance numeric)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id,
    a.starting_balance
      + coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)
      - coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)
  from public.finance_accounts a
  left join public.finance_transactions t
    on t.account_id = a.id and t.user_id = auth.uid()
  where a.user_id = auth.uid()
  group by a.id, a.starting_balance;
$$;
grant execute on function public.finance_account_balances() to authenticated;

-- Income/expense totals per month for the trailing N months (for trend chart).
create or replace function public.finance_monthly_totals(
  p_months int default 6,
  p_scope  text default 'all'
)
returns table (month date, income numeric, expense numeric)
language sql
security definer
set search_path = public
stable
as $$
  with months as (
    select (date_trunc('month', current_date) - (g || ' months')::interval)::date as m
    from generate_series(0, greatest(coalesce(p_months, 6), 1) - 1) as g
  )
  select
    mo.m as month,
    coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)  as income,
    coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0) as expense
  from months mo
  left join public.finance_transactions t
    on date_trunc('month', t.occurred_on)::date = mo.m
   and t.user_id = auth.uid()
   and (p_scope = 'all' or t.scope = p_scope)
  group by mo.m
  order by mo.m;
$$;
grant execute on function public.finance_monthly_totals(int, text) to authenticated;

-- ---------------------------------------------------------------------
-- One-time seed of sensible defaults (idempotent: no-op once data exists)
-- ---------------------------------------------------------------------
create or replace function public.finance_seed_defaults()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if not exists (select 1 from public.finance_categories where user_id = v_user) then
    insert into public.finance_categories (user_id, name, kind, color, sort) values
      (v_user, 'Salary',        'income',  '#16a34a', 0),
      (v_user, 'Sales',         'income',  '#0891b2', 1),
      (v_user, 'Other income',  'income',  '#65a30d', 2),
      (v_user, 'Housing',       'expense', '#2563eb', 0),
      (v_user, 'Groceries',     'expense', '#16a34a', 1),
      (v_user, 'Dining',        'expense', '#ea580c', 2),
      (v_user, 'Transport',     'expense', '#0891b2', 3),
      (v_user, 'Utilities',     'expense', '#7c3aed', 4),
      (v_user, 'Software',      'expense', '#db2777', 5),
      (v_user, 'Marketing',     'expense', '#e11d48', 6),
      (v_user, 'Office',        'expense', '#9333ea', 7),
      (v_user, 'Taxes',         'expense', '#dc2626', 8),
      (v_user, 'Health',        'expense', '#0d9488', 9),
      (v_user, 'Entertainment', 'expense', '#f59e0b', 10),
      (v_user, 'Travel',        'expense', '#3b82f6', 11),
      (v_user, 'Misc',          'expense', '#737373', 12);
  end if;

  if not exists (select 1 from public.finance_accounts where user_id = v_user) then
    insert into public.finance_accounts (user_id, name, type, starting_balance)
    values (v_user, 'Cash', 'cash', 0);
  end if;
end $$;
grant execute on function public.finance_seed_defaults() to authenticated;
