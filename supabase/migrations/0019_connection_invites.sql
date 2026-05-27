-- Invites can now only be sent to accepted connections.
-- The InviteModal lists your connections (excluding existing trip members)
-- and the new invite_connection_to_trip RPC enforces the rule server-side.

-- 1. List accepted connections that can be invited to a given trip
create or replace function public.invitable_connections(p_trip_id uuid)
returns table (
  user_id     uuid,
  full_name   text,
  username    text,
  avatar_url  text
)
language sql
security definer
set search_path = public
as $$
  select
    case when c.requester_id = auth.uid() then c.addressee_id else c.requester_id end as user_id,
    p.full_name,
    p.username,
    p.avatar_url
  from public.social_connections c
  join public.profiles p
    on p.id = case when c.requester_id = auth.uid() then c.addressee_id else c.requester_id end
  where c.status = 'accepted'
    and (c.requester_id = auth.uid() or c.addressee_id = auth.uid())
    -- exclude existing trip members
    and not exists (
      select 1 from public.trip_members tm
      where tm.trip_id = p_trip_id
        and tm.user_id = (case when c.requester_id = auth.uid() then c.addressee_id else c.requester_id end)
    )
    -- exclude pending invites
    and not exists (
      select 1 from public.trip_invites ti
      where ti.trip_id = p_trip_id
        and ti.status = 'pending'
        and ti.user_id = (case when c.requester_id = auth.uid() then c.addressee_id else c.requester_id end)
    )
  order by coalesce(p.full_name, p.username);
$$;
grant execute on function public.invitable_connections(uuid) to authenticated;

-- 2. Send an invite directly to a connected user (no email typing)
create or replace function public.invite_connection_to_trip(
  p_trip_id uuid,
  p_user_id uuid,
  p_role    text
)
returns table (id uuid, token uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user        uuid := auth.uid();
  v_target_email text;
  v_id          uuid;
  v_token       uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  -- Trip ownership check
  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = v_user and role = 'owner'
  ) then
    raise exception 'only the trip owner can invite';
  end if;

  -- Connection check
  if not exists (
    select 1 from public.social_connections
    where status = 'accepted'
      and ((requester_id = v_user and addressee_id = p_user_id)
        or (requester_id = p_user_id and addressee_id = v_user))
  ) then
    raise exception 'you can only invite people you are connected with';
  end if;

  -- Not already a member?
  if exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  ) then
    raise exception 'already a member';
  end if;

  -- Existing pending invite?
  if exists (
    select 1 from public.trip_invites
    where trip_id = p_trip_id and user_id = p_user_id and status = 'pending'
  ) then
    raise exception 'an invite is already pending for this person';
  end if;

  if p_role not in ('editor','viewer') then
    raise exception 'role must be editor or viewer';
  end if;

  -- Resolve email from auth.users (used only to keep schema happy + email fallback)
  select email::text into v_target_email from auth.users where id = p_user_id;
  if v_target_email is null then raise exception 'target user not found'; end if;

  insert into public.trip_invites (trip_id, invited_by, email, user_id, role)
  values (p_trip_id, v_user, v_target_email, p_user_id, p_role)
  returning trip_invites.id, trip_invites.token into v_id, v_token;

  return query select v_id, v_token;
end $$;
grant execute on function public.invite_connection_to_trip(uuid, uuid, text) to authenticated;

-- 3. List my pending trip invites (received)
create or replace function public.my_pending_invites()
returns table (
  invite_id     uuid,
  token         uuid,
  role          text,
  created_at    timestamptz,
  trip_id       uuid,
  trip_title    text,
  trip_destination text,
  trip_start_date date,
  trip_end_date   date,
  inviter_name  text,
  inviter_username text,
  inviter_avatar_url text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    ti.id, ti.token, ti.role, ti.created_at,
    t.id, t.title, t.destination, t.start_date, t.end_date,
    coalesce(p.full_name, p.username, 'Someone') as inviter_name,
    p.username,
    p.avatar_url
  from public.trip_invites ti
  join public.trips t on t.id = ti.trip_id
  left join public.profiles p on p.id = ti.invited_by
  where ti.status = 'pending'
    and (
      ti.user_id = auth.uid()
      or lower(ti.email) = lower((select u.email::text from auth.users u where u.id = auth.uid()))
    )
    and ti.expires_at > now()
  order by ti.created_at desc;
$$;
grant execute on function public.my_pending_invites() to authenticated;

-- 4. Accept/decline an invite by its id (so we don't need the token URL inside the app)
create or replace function public.accept_invite_by_id(p_invite_id uuid)
returns uuid -- trip id
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_token uuid;
begin
  select token into v_token from public.trip_invites where id = p_invite_id;
  if v_token is null then raise exception 'invite not found'; end if;
  return public.accept_invite(v_token);
end $$;
grant execute on function public.accept_invite_by_id(uuid) to authenticated;

create or replace function public.decline_invite_by_id(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_token uuid;
begin
  select token into v_token from public.trip_invites where id = p_invite_id;
  if v_token is null then return; end if;
  perform public.decline_invite(v_token);
end $$;
grant execute on function public.decline_invite_by_id(uuid) to authenticated;
