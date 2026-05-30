-- =====================================================================
-- Business hub: Airbnb collaboration CRM, activity log, and generated docs.
-- Admin-only. All access goes through service-role server actions gated by
-- isAdmin(), but RLS is enabled with owner policies as defense-in-depth.
-- =====================================================================

-- ----- Collaborations (the CRM records) ------------------------------
create table if not exists public.crm_collaborations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  property_name text,
  property_url  text,
  location      text,
  email         text,
  phone         text,
  instagram     text,
  status        text not null default 'lead'
                  check (status in ('lead','contacted','negotiating','booked','filming','published','paid','archived')),
  deal_value    numeric(12,2),
  currency      text not null default 'USD',
  rate_type     text,
  start_date    date,
  end_date      date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_crm_collab_user on public.crm_collaborations (user_id, status);

-- ----- Activity timeline ---------------------------------------------
create table if not exists public.crm_activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  collaboration_id uuid not null references public.crm_collaborations(id) on delete cascade,
  kind             text not null check (kind in ('note','email','call','meeting','status')),
  body             text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_crm_activity_collab on public.crm_activities (collaboration_id, created_at desc);

-- ----- Generated documents (contracts / invoices) --------------------
create table if not exists public.crm_documents (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  collaboration_id uuid references public.crm_collaborations(id) on delete set null,
  type             text not null check (type in ('contract','invoice')),
  number           text,
  title            text not null,
  content          jsonb not null default '{}'::jsonb,
  total            numeric(12,2),
  status           text not null default 'draft' check (status in ('draft','sent','signed','paid','void')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_crm_docs_user on public.crm_documents (user_id, created_at desc);

-- ----- RLS (owner-scoped; service role bypasses) ---------------------
alter table public.crm_collaborations enable row level security;
alter table public.crm_activities     enable row level security;
alter table public.crm_documents      enable row level security;

drop policy if exists "crm_collab owner" on public.crm_collaborations;
create policy "crm_collab owner" on public.crm_collaborations
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "crm_activity owner" on public.crm_activities;
create policy "crm_activity owner" on public.crm_activities
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "crm_docs owner" on public.crm_documents;
create policy "crm_docs owner" on public.crm_documents
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
