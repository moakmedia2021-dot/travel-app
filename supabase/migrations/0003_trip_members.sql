-- trip_members: who belongs to a trip and what permissions they have

create table public.trip_members (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null check (role in ('owner','editor','viewer')),
  joined_at  timestamptz not null default now(),

  unique (trip_id, user_id)
);

create index trip_members_trip_idx on public.trip_members (trip_id);
create index trip_members_user_idx on public.trip_members (user_id);

-- When a trip is created, auto-add the owner as an 'owner' member
create or replace function public.handle_new_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (trip_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_trip_created on public.trips;
create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();
