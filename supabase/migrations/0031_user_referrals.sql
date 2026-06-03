-- =====================================================================
-- Per-user referral codes + referral rewards.
--   * Every profile gets a unique referral_code (backfilled + auto on signup).
--   * referred_by records who referred them (set once, at onboarding).
--   * Free plan active-trip limit grows with referrals: 3 + min(referrals, 10).
-- =====================================================================

alter table public.profiles
  add column if not exists referral_code varchar(8) unique,
  add column if not exists referred_by   varchar(8);

create index if not exists idx_profiles_referred_by on public.profiles (referred_by);

-- Unique short code generator (retry on collision).
create or replace function public.gen_referral_code()
returns varchar
language plpgsql
as $$
declare
  v_code varchar(8);
begin
  loop
    v_code := lower(substring(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;
  return v_code;
end $$;

-- Backfill existing users.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles set referral_code = public.gen_referral_code() where id = r.id;
  end loop;
end $$;

-- New users get a code automatically (replaces the 0001 function; trigger stays).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, referral_code)
  values (new.id, public.gen_referral_code())
  on conflict (id) do nothing;
  return new;
end $$;

-- How many people this user has referred.
create or replace function public.referral_count(p_user uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.profiles p
  where p.referred_by is not null
    and p.referred_by = (select referral_code from public.profiles where id = p_user);
$$;
grant execute on function public.referral_count(uuid) to authenticated;

-- Attribute the current user to a referrer (only once, only a valid other code).
create or replace function public.attribute_referral(p_code varchar)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_my_code varchar(8);
begin
  if v_user is null or p_code is null or p_code = '' then return; end if;
  select referral_code into v_my_code from public.profiles where id = v_user;
  if p_code = v_my_code then return; end if;                                  -- no self-referral
  if exists (select 1 from public.profiles where id = v_user and referred_by is not null) then
    return;                                                                   -- already attributed
  end if;
  if not exists (select 1 from public.profiles where referral_code = p_code) then
    return;                                                                   -- code must exist
  end if;
  update public.profiles set referred_by = p_code where id = v_user and referred_by is null;
end $$;
grant execute on function public.attribute_referral(varchar) to authenticated;

-- Referral stats for the settings page.
create or replace function public.my_referral_stats()
returns table (referral_code varchar, referrals int, bonus_trips int, free_trip_limit int)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.referral_code,
    public.referral_count(p.id),
    least(public.referral_count(p.id), 10),
    3 + least(public.referral_count(p.id), 10)
  from public.profiles p
  where p.id = auth.uid();
$$;
grant execute on function public.my_referral_stats() to authenticated;

-- Recreate create_trip with the referral-boosted free limit.
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
  v_limit       int;
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

    v_limit := 3 + least(public.referral_count(v_user), 10);
    if v_active >= v_limit then
      raise exception 'Free plan limits you to % active trips. Refer friends or upgrade to Premium for unlimited trips.', v_limit;
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
