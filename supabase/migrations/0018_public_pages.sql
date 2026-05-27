-- Slugify helper (used for destination URLs)
create or replace function public.slugify_pg(s text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(s, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Top destinations by public trip count, for SSG generateStaticParams.
create or replace function public.top_destinations(p_limit int default 50)
returns table (destination text, slug text, trip_count int)
language sql
stable
as $$
  select
    destination,
    public.slugify_pg(destination) as slug,
    count(*)::int as trip_count
  from public.trips
  where destination is not null
    and trim(destination) <> ''
    and visibility = 'public'
  group by destination
  order by trip_count desc, destination asc
  limit p_limit;
$$;
grant execute on function public.top_destinations(int) to anon, authenticated;

-- Get destination context for a slug — picks the most-used destination
-- text that slugifies to this slug.
create or replace function public.destination_by_slug(p_slug text)
returns table (destination text, country_code char(2), trip_count int)
language sql
stable
as $$
  select destination, max(country_code) as country_code, count(*)::int as trip_count
  from public.trips
  where public.slugify_pg(destination) = p_slug
    and visibility = 'public'
  group by destination
  order by trip_count desc
  limit 1;
$$;
grant execute on function public.destination_by_slug(text) to anon, authenticated;

-- Travelers planning a trip to this destination (anyone with upcoming
-- public/group trips matching the slug).
create or replace function public.travelers_for_destination(p_slug text, p_limit int default 8)
returns table (
  user_id     uuid,
  full_name   text,
  username    text,
  avatar_url  text,
  start_date  date,
  end_date    date
)
language sql
stable
as $$
  select distinct on (t.owner_id)
    t.owner_id, p.full_name, p.username, p.avatar_url,
    t.start_date, t.end_date
  from public.trips t
  join public.profiles p on p.id = t.owner_id
  where public.slugify_pg(t.destination) = p_slug
    and t.visibility in ('public','group')
    and (t.end_date is null or t.end_date >= current_date)
  order by t.owner_id, t.start_date asc nulls last
  limit p_limit;
$$;
grant execute on function public.travelers_for_destination(text, int) to anon, authenticated;

-- Travel tips for a destination — best-effort fuzzy match
-- (location_name contains the destination text)
create or replace function public.tips_for_destination(p_slug text, p_limit int default 20)
returns table (
  id            uuid,
  user_id       uuid,
  location_name text,
  content       text,
  category      text,
  created_at    timestamptz,
  full_name     text,
  username      text,
  avatar_url    text
)
language sql
stable
as $$
  with target as (
    select destination from public.destination_by_slug(p_slug)
  )
  select t.id, t.user_id, t.location_name, t.content, t.category, t.created_at,
         p.full_name, p.username, p.avatar_url
  from public.travel_tips t
  join public.profiles p on p.id = t.user_id
  cross join target
  where t.location_name ilike '%' || target.destination || '%'
  order by t.created_at desc
  limit p_limit;
$$;
grant execute on function public.tips_for_destination(text, int) to anon, authenticated;

-- "Copy this trip" — fork a trip's itinerary into a new draft trip
-- owned by the current user.
create or replace function public.copy_trip(p_source_trip_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_new_id uuid;
  v_source record;
  v_item   record;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select t.* into v_source from public.trips t
   where t.id = p_source_trip_id
     and (
       t.visibility = 'public'
       or exists (
         select 1 from public.trip_members
          where trip_id = t.id and user_id = v_user
       )
     );
  if v_source.id is null then raise exception 'trip not found or not viewable'; end if;

  insert into public.trips (
    owner_id, title, destination, country_code,
    cover_image_url, start_date, end_date,
    status, visibility, currency
  )
  values (
    v_user, v_source.title || ' (copy)', v_source.destination, v_source.country_code,
    v_source.cover_image_url, null, null,
    'draft', 'private', v_source.currency
  )
  returning id into v_new_id;

  -- Copy itinerary items (skip price + booking ref — those are personal)
  for v_item in
    select * from public.itinerary_items where trip_id = p_source_trip_id
    order by day_number, position
  loop
    insert into public.itinerary_items (
      trip_id, day_number, position, title, type,
      location_name, location_lat, location_lng,
      notes, created_by
    ) values (
      v_new_id, v_item.day_number, v_item.position, v_item.title, v_item.type,
      v_item.location_name, v_item.location_lat, v_item.location_lng,
      v_item.notes, v_user
    );
  end loop;

  return v_new_id;
end $$;
grant execute on function public.copy_trip(uuid) to authenticated;

-- Allow anon users to read public trips + their itinerary items.
-- The existing "members can read" policy uses is_trip_member which requires
-- auth.uid(); add separate anon-friendly read policies.

drop policy if exists "trips: anon read public" on public.trips;
create policy "trips: anon read public"
  on public.trips for select
  to anon
  using (visibility = 'public');

drop policy if exists "itinerary: anon read public" on public.itinerary_items;
create policy "itinerary: anon read public"
  on public.itinerary_items for select
  to anon
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.visibility = 'public'
    )
  );

drop policy if exists "profiles: anon read" on public.profiles;
create policy "profiles: anon read"
  on public.profiles for select
  to anon
  using (true);

drop policy if exists "trip_members: anon read public trips" on public.trip_members;
create policy "trip_members: anon read public trips"
  on public.trip_members for select
  to anon
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.visibility = 'public'
    )
  );

drop policy if exists "trip_posts: anon read public trips" on public.trip_posts;
create policy "trip_posts: anon read public trips"
  on public.trip_posts for select
  to anon
  using (
    trip_id is null  -- standalone posts
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.visibility = 'public'
    )
  );

drop policy if exists "travel_tips: anon read" on public.travel_tips;
create policy "travel_tips: anon read"
  on public.travel_tips for select
  to anon
  using (true);
