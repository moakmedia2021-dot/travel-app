-- =====================================================================
-- Real-time collaboration: trip chat, system messages, realtime publication
-- =====================================================================

create table if not exists public.trip_messages (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  content     text not null check (length(content) between 1 and 4000),
  type        text not null default 'text' check (type in ('text','system')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_trip_messages_trip_created
  on public.trip_messages (trip_id, created_at desc);

alter table public.trip_messages enable row level security;

drop policy if exists "trip_messages: members read" on public.trip_messages;
create policy "trip_messages: members read"
  on public.trip_messages for select
  to authenticated
  using (public.is_trip_member(trip_id));

-- Members can insert their own text messages.
-- System messages are inserted via SECURITY DEFINER triggers below, which
-- bypass this policy.
drop policy if exists "trip_messages: members write text" on public.trip_messages;
create policy "trip_messages: members write text"
  on public.trip_messages for insert
  to authenticated
  with check (
    public.is_trip_member(trip_id)
    and user_id = auth.uid()
    and type = 'text'
  );

-- ---------------------------------------------------------------------
-- Send-message RPC (so we can use SECURITY DEFINER from server actions
-- without depending on the existing platform RLS quirk)
-- ---------------------------------------------------------------------
create or replace function public.send_trip_message(p_trip_id uuid, p_content text)
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
  if not exists (
    select 1 from public.trip_members where trip_id = p_trip_id and user_id = v_user
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.trip_messages (trip_id, user_id, content, type)
  values (p_trip_id, v_user, trim(p_content), 'text')
  returning id into v_id;

  return v_id;
end $$;
grant execute on function public.send_trip_message(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Auto-system-messages on key events
-- Inserts a 'system' row whenever an itinerary item or expense is added.
-- The trigger runs with the inserter's auth.uid() so we can look up the name.
-- ---------------------------------------------------------------------
create or replace function public.emit_itinerary_system_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(p.full_name, p.username, 'Someone') into v_name
    from public.profiles p
    where p.id = coalesce(new.created_by, auth.uid());

  insert into public.trip_messages (trip_id, user_id, content, type)
  values (
    new.trip_id,
    coalesce(new.created_by, auth.uid()),
    format('%s added "%s" to Day %s', v_name, new.title, new.day_number),
    'system'
  );
  return new;
end $$;

drop trigger if exists trg_itinerary_system_msg on public.itinerary_items;
create trigger trg_itinerary_system_msg
  after insert on public.itinerary_items
  for each row execute function public.emit_itinerary_system_message();


create or replace function public.emit_expense_system_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(p.full_name, p.username, 'Someone') into v_name
    from public.profiles p
    where p.id = coalesce(new.paid_by, auth.uid());

  insert into public.trip_messages (trip_id, user_id, content, type)
  values (
    new.trip_id,
    coalesce(new.paid_by, auth.uid()),
    format('%s logged a %s%s expense: %s',
      v_name,
      coalesce(new.currency, 'USD'),
      to_char(new.amount, 'FM999G999D00'),
      new.title
    ),
    'system'
  );
  return new;
end $$;

drop trigger if exists trg_expense_system_msg on public.expenses;
create trigger trg_expense_system_msg
  after insert on public.expenses
  for each row execute function public.emit_expense_system_message();

-- ---------------------------------------------------------------------
-- Realtime publication: emit changes for these tables to subscribers
-- ---------------------------------------------------------------------
-- Supabase ships with a 'supabase_realtime' publication. Tables must
-- be added explicitly. Safe to re-run (alter publication add is idempotent
-- under "do" block).

do $$
begin
  -- itinerary_items
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'itinerary_items'
  ) then
    execute 'alter publication supabase_realtime add table public.itinerary_items';
  end if;

  -- expenses
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'expenses'
  ) then
    execute 'alter publication supabase_realtime add table public.expenses';
  end if;

  -- trip_messages
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.trip_messages';
  end if;
end $$;
