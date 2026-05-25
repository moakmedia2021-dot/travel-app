-- Onboarding flag — defaults to false so new sign-ups land in the wizard.
alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

-- For existing users (created before this migration), set them to true
-- so we don't kick them through onboarding retroactively.
update public.profiles set onboarding_complete = true where created_at < now();

-- RPC: atomic onboarding completion — updates profile fields + optionally
-- creates a first trip in one transaction.
create or replace function public.complete_onboarding(
  p_full_name         text,
  p_username          text,
  p_home_city         text,
  p_avatar_url        text,
  p_travel_tags       text[],
  p_countries_visited text[],
  p_trip_title        text default null,
  p_trip_destination  text default null,
  p_trip_start_date   date default null,
  p_trip_end_date     date default null,
  p_trip_visibility   text default 'private'
)
returns uuid -- trip_id if created, else null
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_uname     text := lower(trim(coalesce(p_username, '')));
  v_trip_id   uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if v_uname <> '' then
    if not (v_uname ~ '^[a-z0-9_]{3,32}$') then
      raise exception 'username must be 3-32 chars: a-z, 0-9, underscore';
    end if;
    if exists (select 1 from public.profiles where username = v_uname and id <> v_user) then
      raise exception 'username is taken';
    end if;
  end if;

  update public.profiles
    set full_name           = nullif(trim(coalesce(p_full_name,'')),''),
        username            = nullif(v_uname,''),
        home_city           = nullif(trim(coalesce(p_home_city,'')),''),
        avatar_url          = nullif(trim(coalesce(p_avatar_url,'')),''),
        travel_tags         = p_travel_tags,
        countries_visited   = coalesce(p_countries_visited, '{}'::text[]),
        onboarding_complete = true
    where id = v_user;

  if p_trip_title is not null and length(trim(p_trip_title)) > 0 then
    insert into public.trips (owner_id, title, destination, start_date, end_date, visibility, status)
    values (
      v_user, trim(p_trip_title),
      nullif(trim(coalesce(p_trip_destination,'')),''),
      p_trip_start_date, p_trip_end_date,
      coalesce(p_trip_visibility, 'private'), 'draft'
    )
    returning id into v_trip_id;
  end if;

  return v_trip_id;
end $$;

grant execute on function public.complete_onboarding(
  text, text, text, text, text[], text[], text, text, date, date, text
) to authenticated;

-- RPC: check if a username is available (case-insensitive, excluding self)
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where username = lower(trim(p_username))
      and id <> auth.uid()
  )
  and lower(trim(p_username)) ~ '^[a-z0-9_]{3,32}$';
$$;
grant execute on function public.username_available(text) to authenticated;
