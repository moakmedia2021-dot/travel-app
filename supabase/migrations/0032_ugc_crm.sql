-- =====================================================================
-- UGC campaign CRM (admin-only). Track clients you create content for,
-- what they pay, the social accounts you run for them (with credentials),
-- and every video — including a content calendar via scheduled/posted dates.
-- All access goes through service-role server actions gated by checkAdmin();
-- RLS is enabled with owner policies as defense-in-depth.
-- =====================================================================

-- ----- Clients --------------------------------------------------------
create table if not exists public.ugc_clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  status      text not null default 'active'
                check (status in ('lead','active','paused','ended')),
  rate        numeric(12,2),
  rate_period text not null default 'per_video'
                check (rate_period in ('per_video','monthly','flat','hourly')),
  currency    text not null default 'USD',
  color       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_ugc_clients_user on public.ugc_clients (user_id, status);

-- ----- Social accounts (with credentials) -----------------------------
create table if not exists public.ugc_accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  client_id      uuid not null references public.ugc_clients(id) on delete cascade,
  platform       text not null check (platform in ('tiktok','instagram','facebook','youtube_shorts')),
  handle         text,
  url            text,
  login_email    text,
  login_password text,
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_ugc_accounts_client on public.ugc_accounts (client_id);

-- ----- Videos (deliverables + content calendar) -----------------------
create table if not exists public.ugc_videos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  client_id     uuid not null references public.ugc_clients(id) on delete cascade,
  account_id    uuid references public.ugc_accounts(id) on delete set null,
  title         text not null,
  platform      text check (platform in ('tiktok','instagram','facebook','youtube_shorts')),
  status        text not null default 'idea'
                  check (status in ('idea','scripted','filmed','scheduled','posted')),
  scheduled_for date,
  posted_on     date,
  url           text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_ugc_videos_user  on public.ugc_videos (user_id);
create index if not exists idx_ugc_videos_client on public.ugc_videos (client_id);
create index if not exists idx_ugc_videos_dates  on public.ugc_videos (scheduled_for, posted_on);

-- ----- RLS (owner-scoped; service role bypasses) ----------------------
alter table public.ugc_clients  enable row level security;
alter table public.ugc_accounts enable row level security;
alter table public.ugc_videos   enable row level security;

drop policy if exists "ugc_clients owner" on public.ugc_clients;
create policy "ugc_clients owner" on public.ugc_clients
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "ugc_accounts owner" on public.ugc_accounts;
create policy "ugc_accounts owner" on public.ugc_accounts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "ugc_videos owner" on public.ugc_videos;
create policy "ugc_videos owner" on public.ugc_videos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
