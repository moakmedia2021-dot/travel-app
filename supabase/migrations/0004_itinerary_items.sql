-- itinerary_items: an ordered list of things planned for a trip
-- position allows reordering within a day; numeric leaves room for fractional inserts

create table public.itinerary_items (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips(id) on delete cascade,
  day_number      int  not null check (day_number >= 1),
  position        numeric not null default 0,
  title           text not null,
  type            text not null check (type in ('flight','hotel','activity','note','transport')),
  start_time      timestamptz,
  end_time        timestamptz,
  location_name   text,
  location_lat    double precision check (location_lat is null or location_lat between -90  and 90),
  location_lng    double precision check (location_lng is null or location_lng between -180 and 180),
  price           numeric(12,2) check (price is null or price >= 0),
  currency        char(3),
  booking_ref     text,
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),

  constraint itinerary_time_order check (start_time is null or end_time is null or end_time >= start_time)
);

create index itinerary_trip_day_pos_idx on public.itinerary_items (trip_id, day_number, position);
create index itinerary_type_idx          on public.itinerary_items (type);
create index itinerary_start_time_idx    on public.itinerary_items (start_time);
