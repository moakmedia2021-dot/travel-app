-- trips: a planned or in-progress travel itinerary

create table public.trips (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  destination       text,
  country_code      char(2),
  cover_image_url   text,
  start_date        date,
  end_date          date,
  status            text not null default 'draft'
                      check (status in ('draft','planned','active','completed')),
  visibility        text not null default 'private'
                      check (visibility in ('private','group','public')),
  budget_total      numeric(12,2) check (budget_total is null or budget_total >= 0),
  currency          char(3),
  created_at        timestamptz not null default now(),

  constraint trips_date_order check (start_date is null or end_date is null or end_date >= start_date)
);

create index trips_owner_idx       on public.trips (owner_id);
create index trips_status_idx      on public.trips (status);
create index trips_start_date_idx  on public.trips (start_date);
create index trips_visibility_idx  on public.trips (visibility);
