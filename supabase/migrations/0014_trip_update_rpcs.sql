-- update_trip / delete_trip RPCs. Owner-only.
-- Uses SECURITY DEFINER for the same reason as create_trip (platform RLS quirk).

create or replace function public.update_trip(
  p_id           uuid,
  p_title        text,
  p_destination  text,
  p_start_date   date,
  p_end_date     date,
  p_status       text,
  p_visibility   text,
  p_budget_total numeric,
  p_currency     text,
  p_travelers    int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_id and user_id = v_user and role in ('owner','editor')
  ) then
    raise exception 'only the owner or an editor can update the trip';
  end if;

  if p_status not in ('draft','planned','active','completed') then
    raise exception 'invalid status';
  end if;
  if p_visibility not in ('private','group','public') then
    raise exception 'invalid visibility';
  end if;
  if length(trim(p_title)) = 0 then
    raise exception 'title is required';
  end if;

  update public.trips
  set title        = trim(p_title),
      destination  = nullif(trim(coalesce(p_destination, '')), ''),
      start_date   = p_start_date,
      end_date     = p_end_date,
      status       = p_status,
      visibility   = p_visibility,
      budget_total = p_budget_total,
      currency     = p_currency,
      travelers    = p_travelers
  where id = p_id;
end $$;

grant execute on function public.update_trip(
  uuid, text, text, date, date, text, text, numeric, text, int
) to authenticated;


create or replace function public.delete_trip(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_id and user_id = v_user and role = 'owner'
  ) then
    raise exception 'only the trip owner can delete it';
  end if;

  -- All related rows cascade via FK on delete cascade.
  delete from public.trips where id = p_id;
end $$;

grant execute on function public.delete_trip(uuid) to authenticated;
