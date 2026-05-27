-- Billing + notifications + soft-delete additions

alter table public.profiles
  add column if not exists subscription_status     text not null default 'free'
    check (subscription_status in ('free','premium','cancelled')),
  add column if not exists subscription_id         text,
  add column if not exists subscription_customer_id text,
  add column if not exists subscription_period_end timestamptz,
  add column if not exists notification_prefs      jsonb not null default '{}'::jsonb,
  add column if not exists deleted_at              timestamptz;

create index if not exists profiles_subscription_customer_idx
  on public.profiles (subscription_customer_id);

-- isPremium helper used inside RPCs
create or replace function public.is_user_premium(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select subscription_period_end is not null
            and subscription_period_end > now()
       from public.profiles
       where id = p_user_id),
    false
  );
$$;
grant execute on function public.is_user_premium(uuid) to authenticated, anon;

-- Enforce limits inside create_trip
create or replace function public.create_trip(
  p_title         text,
  p_destination   text,
  p_start_date    date,
  p_end_date      date,
  p_travelers     int,
  p_visibility    text,
  p_budget_total  numeric,
  p_currency      text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user        uuid := auth.uid();
  v_trip_id     uuid;
  v_is_premium  boolean;
  v_active      int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  v_is_premium := public.is_user_premium(v_user);

  if not v_is_premium then
    select count(*) into v_active
    from public.trips t
    join public.trip_members tm on tm.trip_id = t.id
    where tm.user_id = v_user
      and tm.role = 'owner'
      and t.status in ('draft', 'planned', 'active');
    if v_active >= 3 then
      raise exception 'Free plan limits you to 3 active trips. Upgrade to Premium for unlimited trips.';
    end if;
  end if;

  insert into public.trips (
    owner_id, title, destination, start_date, end_date,
    travelers, visibility, budget_total, currency, status
  )
  values (
    v_user, trim(p_title), nullif(trim(coalesce(p_destination, '')), ''),
    p_start_date, p_end_date, p_travelers, p_visibility,
    p_budget_total, p_currency, 'draft'
  )
  returning id into v_trip_id;

  return v_trip_id;
end $$;
grant execute on function public.create_trip(
  text, text, date, date, int, text, numeric, text
) to authenticated;

-- Enforce member limit inside invite_connection_to_trip
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
  v_user           uuid := auth.uid();
  v_target_email   text;
  v_id             uuid;
  v_token          uuid;
  v_owner_id       uuid;
  v_owner_premium  boolean;
  v_member_count   int;
  v_pending_count  int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = v_user and role = 'owner'
  ) then
    raise exception 'only the trip owner can invite';
  end if;

  if not exists (
    select 1 from public.social_connections
    where status = 'accepted'
      and ((requester_id = v_user and addressee_id = p_user_id)
        or (requester_id = p_user_id and addressee_id = v_user))
  ) then
    raise exception 'you can only invite people you are connected with';
  end if;

  if exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  ) then
    raise exception 'already a member';
  end if;

  if exists (
    select 1 from public.trip_invites
    where trip_id = p_trip_id and user_id = p_user_id and status = 'pending'
  ) then
    raise exception 'an invite is already pending for this person';
  end if;

  if p_role not in ('editor','viewer') then
    raise exception 'role must be editor or viewer';
  end if;

  -- Member-count limit (free = 5 total members per trip)
  select tm.user_id into v_owner_id
  from public.trip_members tm
  where tm.trip_id = p_trip_id and tm.role = 'owner';
  v_owner_premium := public.is_user_premium(v_owner_id);

  if not v_owner_premium then
    select count(*) into v_member_count from public.trip_members where trip_id = p_trip_id;
    select count(*) into v_pending_count
      from public.trip_invites where trip_id = p_trip_id and status = 'pending';
    if v_member_count + v_pending_count >= 5 then
      raise exception 'Free plan is limited to 5 members per trip. Upgrade to Premium.';
    end if;
  end if;

  select email::text into v_target_email from auth.users where id = p_user_id;
  if v_target_email is null then raise exception 'target user not found'; end if;

  insert into public.trip_invites (trip_id, invited_by, email, user_id, role)
  values (p_trip_id, v_user, v_target_email, p_user_id, p_role)
  returning trip_invites.id, trip_invites.token into v_id, v_token;

  return query select v_id, v_token;
end $$;
grant execute on function public.invite_connection_to_trip(uuid, uuid, text) to authenticated;

-- Soft delete account: anonymize profile, keep trip data for other members
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  update public.profiles
  set deleted_at        = now(),
      full_name         = null,
      username          = 'deleted-' || substr(id::text, 1, 8),
      bio               = null,
      home_city         = null,
      home_airport      = null,
      avatar_url        = null,
      travel_tags       = null,
      countries_visited = null,
      instagram_handle  = null
  where id = v_user;
end $$;
grant execute on function public.delete_my_account() to authenticated;
