-- expenses: money spent on a trip, optionally split between members

create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  paid_by     uuid not null references public.profiles(id) on delete restrict,
  title       text not null,
  amount      numeric(12,2) not null check (amount >= 0),
  currency    char(3) not null,
  category    text,
  split_type  text not null default 'equal' check (split_type in ('equal','custom')),
  date        date not null default current_date,
  receipt_url text,
  created_at  timestamptz not null default now()
);

create index expenses_trip_idx     on public.expenses (trip_id);
create index expenses_paid_by_idx  on public.expenses (paid_by);
create index expenses_date_idx     on public.expenses (date);
create index expenses_category_idx on public.expenses (category);

create table public.expense_splits (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references public.expenses(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount_owed numeric(12,2) not null check (amount_owed >= 0),
  settled     boolean not null default false,

  unique (expense_id, user_id)
);

create index expense_splits_expense_idx on public.expense_splits (expense_id);
create index expense_splits_user_idx    on public.expense_splits (user_id);
