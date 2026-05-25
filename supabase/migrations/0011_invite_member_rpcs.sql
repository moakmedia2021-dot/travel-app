-- Search auth.users + profiles for invitable people for a trip.
-- Excludes anyone who is already a member or has a pending invite.
-- Caller must themselves be a trip member.

create or replace function public.search_invitable_users(
  p_trip_id uuid,
  p_query   text
)
returns table (
  id          uuid,
  email       text,
  username    text,
  full_name   text,
  avatar_url  text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_q    text := lower(trim(p_query));
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from public.trip_members where trip_id = p_trip_id and user_id = v_user
  ) then
    raise exception 'forbidden';
  end if;
  if length(v_q) < 2 then return; end if;

  return query
  select
    u.id,
    u.email::text                                                     as email,
    p.username,
    p.full_name,
    p.avatar_url
  from auth.users u
  left join public.profiles p on p.id = u.id
  where (
        lower(u.email) like v_q || '%'
     or lower(coalesce(p.username, ''))  like v_q || '%'
     or lower(coalesce(p.full_name, '')) like '%' || v_q || '%'
  )
  and u.id not in (
    select user_id from public.trip_members where trip_id = p_trip_id
  )
  and u.id not in (
    select user_id from public.trip_invites
    where trip_id = p_trip_id and status = 'pending' and user_id is not null
  )
  order by
    case when lower(u.email) = v_q then 0
         when lower(u.email) like v_q || '%' then 1
         else 2 end,
    u.email
  limit 10;
end $$;

grant execute on function public.search_invitable_users(uuid, text) to authenticated;


-- Create an invite. Email is normalized to lowercase. If a matching user
-- exists in auth.users, user_id is set; otherwise it's null and we just
-- have an email to send to.
create or replace function public.create_invite(
  p_trip_id uuid,
  p_email   text,
  p_role    text
)
returns table (id uuid, token uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user      uuid := auth.uid();
  v_email     text := lower(trim(p_email));
  v_target_id uuid;
  v_id        uuid;
  v_token     uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = v_user and role = 'owner'
  ) then
    raise exception 'only the trip owner can invite';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;
  if p_role not in ('editor','viewer') then
    raise exception 'role must be editor or viewer';
  end if;

  select u.id into v_target_id from auth.users u where lower(u.email) = v_email;

  -- already a member?
  if v_target_id is not null and exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = v_target_id
  ) then
    raise exception 'user is already a member';
  end if;

  -- existing pending invite?
  if exists (
    select 1 from public.trip_invites
    where trip_id = p_trip_id and lower(email) = v_email and status = 'pending'
  ) then
    raise exception 'an invite is already pending for this email';
  end if;

  insert into public.trip_invites (trip_id, invited_by, email, user_id, role)
  values (p_trip_id, v_user, v_email, v_target_id, p_role)
  returning trip_invites.id, trip_invites.token into v_id, v_token;

  return query select v_id, v_token;
end $$;

grant execute on function public.create_invite(uuid, text, text) to authenticated;


create or replace function public.accept_invite(p_token uuid)
returns uuid -- the trip_id we joined
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user        uuid := auth.uid();
  v_user_email  text;
  v_invite      record;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select email::text into v_user_email from auth.users where id = v_user;

  select * into v_invite from public.trip_invites where token = p_token;
  if v_invite.id is null then raise exception 'invite not found'; end if;

  if v_invite.status <> 'pending' then
    raise exception 'invite is %', v_invite.status;
  end if;

  if v_invite.expires_at < now() then
    update public.trip_invites set status = 'expired' where id = v_invite.id;
    raise exception 'invite expired';
  end if;

  if v_invite.user_id is not null and v_invite.user_id <> v_user then
    raise exception 'this invite is for someone else';
  end if;
  if v_invite.user_id is null and lower(v_invite.email) <> lower(v_user_email) then
    raise exception 'this invite is for %, but you signed in as %', v_invite.email, v_user_email;
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, v_user, v_invite.role)
  on conflict (trip_id, user_id) do nothing;

  update public.trip_invites
  set status = 'accepted', user_id = v_user
  where id = v_invite.id;

  return v_invite.trip_id;
end $$;

grant execute on function public.accept_invite(uuid) to authenticated;


create or replace function public.decline_invite(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user       uuid := auth.uid();
  v_user_email text;
  v_invite     record;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select email::text into v_user_email from auth.users where id = v_user;
  select * into v_invite from public.trip_invites where token = p_token;
  if v_invite.id is null then raise exception 'invite not found'; end if;
  if v_invite.status <> 'pending' then return; end if;

  if v_invite.user_id is not null and v_invite.user_id <> v_user then
    raise exception 'this invite is not for you';
  end if;
  if v_invite.user_id is null and lower(v_invite.email) <> lower(v_user_email) then
    raise exception 'this invite is not for you';
  end if;

  update public.trip_invites
  set status = 'declined', user_id = v_user
  where id = v_invite.id;
end $$;

grant execute on function public.decline_invite(uuid) to authenticated;


-- Owner cancels a pending invite they sent
create or replace function public.cancel_invite(p_invite_id uuid)
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
  select trip_id into v_trip_id from public.trip_invites where id = p_invite_id;
  if v_trip_id is null then return; end if;
  if not exists (
    select 1 from public.trip_members
    where trip_id = v_trip_id and user_id = v_user and role = 'owner'
  ) then
    raise exception 'only the trip owner can cancel invites';
  end if;
  update public.trip_invites set status = 'cancelled'
   where id = p_invite_id and status = 'pending';
end $$;

grant execute on function public.cancel_invite(uuid) to authenticated;


-- Owner changes a member's role (editor <-> viewer). Cannot change owner.
create or replace function public.update_member_role(
  p_trip_id uuid,
  p_user_id uuid,
  p_role    text
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
    where trip_id = p_trip_id and user_id = v_user and role = 'owner'
  ) then
    raise exception 'only the owner can change roles';
  end if;
  if p_role not in ('editor','viewer') then
    raise exception 'role must be editor or viewer';
  end if;
  if exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id and role = 'owner'
  ) then
    raise exception 'cannot change the owner''s role';
  end if;
  update public.trip_members
  set role = p_role
  where trip_id = p_trip_id and user_id = p_user_id;
end $$;

grant execute on function public.update_member_role(uuid, uuid, text) to authenticated;


-- Owner removes a member. Cannot remove themselves (owner).
create or replace function public.remove_member(
  p_trip_id uuid,
  p_user_id uuid
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
    where trip_id = p_trip_id and user_id = v_user and role = 'owner'
  ) then
    raise exception 'only the owner can remove members';
  end if;
  if p_user_id = v_user then
    raise exception 'owner cannot remove themselves';
  end if;
  delete from public.trip_members
  where trip_id = p_trip_id and user_id = p_user_id;
end $$;

grant execute on function public.remove_member(uuid, uuid) to authenticated;
