-- =====================================================================
-- Trip chat: delete messages
--   * Authors can delete their own messages; the trip owner can delete any.
--   * REPLICA IDENTITY FULL so realtime DELETE events carry trip_id (needed
--     for the client's `trip_id=eq.X` filter + RLS to deliver the event).
-- =====================================================================

create or replace function public.delete_trip_message(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_trip    uuid;
  v_author  uuid;
  v_owner   uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select trip_id, user_id into v_trip, v_author
  from public.trip_messages
  where id = p_id;
  if v_trip is null then raise exception 'not found'; end if;

  select owner_id into v_owner from public.trips where id = v_trip;

  if v_user <> coalesce(v_author, '00000000-0000-0000-0000-000000000000'::uuid)
     and v_user <> coalesce(v_owner, '00000000-0000-0000-0000-000000000000'::uuid) then
    raise exception 'forbidden';
  end if;

  delete from public.trip_messages where id = p_id;
  return p_id;
end $$;
grant execute on function public.delete_trip_message(uuid) to authenticated;

-- Ensure realtime DELETE payloads include all columns (esp. trip_id) so the
-- subscription filter and RLS can authorize delivery.
alter table public.trip_messages replica identity full;
