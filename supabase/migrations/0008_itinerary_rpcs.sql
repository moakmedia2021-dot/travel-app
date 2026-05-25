-- RPC functions for itinerary writes. Workaround for the platform RLS bug
-- that affected direct INSERTs (same pattern as create_trip).
-- All functions verify the caller is an owner/editor of the trip.

create or replace function public.create_itinerary_item(
  p_trip_id        uuid,
  p_day_number     int,
  p_position       numeric,
  p_title          text,
  p_type           text,
  p_start_time     timestamptz,
  p_end_time       timestamptz,
  p_location_name  text,
  p_price          numeric,
  p_currency       text,
  p_booking_ref    text,
  p_notes          text
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

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id
      and user_id = v_user
      and role in ('owner','editor')
  ) then
    raise exception 'forbidden';
  end if;

  insert into public.itinerary_items (
    trip_id, day_number, position, title, type,
    start_time, end_time, location_name,
    price, currency, booking_ref, notes, created_by
  )
  values (
    p_trip_id, p_day_number, p_position, p_title, p_type,
    p_start_time, p_end_time, p_location_name,
    p_price, p_currency, p_booking_ref, p_notes, v_user
  )
  returning id into v_id;

  return v_id;
end $$;

grant execute on function public.create_itinerary_item(
  uuid, int, numeric, text, text,
  timestamptz, timestamptz, text,
  numeric, text, text, text
) to authenticated;


create or replace function public.update_itinerary_item(
  p_id             uuid,
  p_day_number     int,
  p_title          text,
  p_type           text,
  p_start_time     timestamptz,
  p_end_time       timestamptz,
  p_location_name  text,
  p_price          numeric,
  p_currency       text,
  p_booking_ref    text,
  p_notes          text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_trip_id uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select trip_id into v_trip_id from public.itinerary_items where id = p_id;
  if v_trip_id is null then raise exception 'not found'; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = v_trip_id
      and user_id = v_user
      and role in ('owner','editor')
  ) then
    raise exception 'forbidden';
  end if;

  update public.itinerary_items
  set day_number    = p_day_number,
      title         = p_title,
      type          = p_type,
      start_time    = p_start_time,
      end_time      = p_end_time,
      location_name = p_location_name,
      price         = p_price,
      currency      = p_currency,
      booking_ref   = p_booking_ref,
      notes         = p_notes
  where id = p_id;
end $$;

grant execute on function public.update_itinerary_item(
  uuid, int, text, text,
  timestamptz, timestamptz, text,
  numeric, text, text, text
) to authenticated;


create or replace function public.delete_itinerary_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_trip_id uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select trip_id into v_trip_id from public.itinerary_items where id = p_id;
  if v_trip_id is null then return; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = v_trip_id
      and user_id = v_user
      and role in ('owner','editor')
  ) then
    raise exception 'forbidden';
  end if;

  delete from public.itinerary_items where id = p_id;
end $$;

grant execute on function public.delete_itinerary_item(uuid) to authenticated;


-- Reorder items within a single day. Takes ids in their new order
-- and sets position = 1, 2, 3, ...
create or replace function public.reorder_itinerary_items(
  p_trip_id     uuid,
  p_day_number  int,
  p_ordered_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  i int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id
      and user_id = v_user
      and role in ('owner','editor')
  ) then
    raise exception 'forbidden';
  end if;

  for i in 1..array_length(p_ordered_ids, 1) loop
    update public.itinerary_items
    set position = i
    where id = p_ordered_ids[i]
      and trip_id = p_trip_id
      and day_number = p_day_number;
  end loop;
end $$;

grant execute on function public.reorder_itinerary_items(uuid, int, uuid[]) to authenticated;
