-- =========================================================================
-- Social module schema: follows, connections, posts, tips + profile columns
-- =========================================================================

-- Profile additions
alter table public.profiles
  add column if not exists travel_tags       text[],
  add column if not exists countries_visited text[],
  add column if not exists instagram_handle  text;

-- ---------- social_follows (lightweight, instant) ----------
create table if not exists public.social_follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);
create index if not exists social_follows_following_idx on public.social_follows (following_id);
alter table public.social_follows enable row level security;

drop policy if exists "follows: participants read" on public.social_follows;
create policy "follows: participants read"
  on public.social_follows for select
  to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

-- ---------- social_connections (request/approve) ----------
create table if not exists public.social_connections (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending','accepted','declined','cancelled')),
  message       text,
  created_at    timestamptz not null default now(),
  constraint no_self_connection check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
create index if not exists social_conn_addressee_idx on public.social_connections (addressee_id, status);
create index if not exists social_conn_requester_idx on public.social_connections (requester_id, status);
alter table public.social_connections enable row level security;

drop policy if exists "connections: participants read" on public.social_connections;
create policy "connections: participants read"
  on public.social_connections for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ---------- trip_posts ----------
create table if not exists public.trip_posts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  trip_id         uuid references public.trips(id) on delete set null,
  content         text not null check (length(content) between 1 and 2000),
  location_name   text,
  image_url       text,
  created_at      timestamptz not null default now()
);
create index if not exists trip_posts_user_idx on public.trip_posts (user_id, created_at desc);
create index if not exists trip_posts_trip_idx on public.trip_posts (trip_id);
alter table public.trip_posts enable row level security;

drop policy if exists "trip_posts: read" on public.trip_posts;
create policy "trip_posts: read"
  on public.trip_posts for select
  to authenticated
  using (
    trip_id is null
    or exists (
      select 1 from public.trips t
      where t.id = trip_id
        and (t.visibility = 'public' or public.is_trip_member(t.id))
    )
  );

-- ---------- travel_tips ----------
create table if not exists public.travel_tips (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  location_name  text not null,
  lat            double precision check (lat is null or lat between -90 and 90),
  lng            double precision check (lng is null or lng between -180 and 180),
  content        text not null check (length(content) between 1 and 2000),
  category       text,
  created_at     timestamptz not null default now()
);
create index if not exists travel_tips_user_idx on public.travel_tips (user_id, created_at desc);
alter table public.travel_tips enable row level security;

drop policy if exists "travel_tips: read all" on public.travel_tips;
create policy "travel_tips: read all"
  on public.travel_tips for select
  to authenticated
  using (true);

-- =========================================================================
-- RPCs (SECURITY DEFINER to bypass the platform RLS quirk we've hit)
-- =========================================================================

-- --- Follows ---
create or replace function public.follow_user(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if v_user = p_target then raise exception 'cannot follow yourself'; end if;
  insert into public.social_follows (follower_id, following_id)
  values (v_user, p_target) on conflict do nothing;
end $$;
grant execute on function public.follow_user(uuid) to authenticated;

create or replace function public.unfollow_user(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  delete from public.social_follows
    where follower_id = v_user and following_id = p_target;
end $$;
grant execute on function public.unfollow_user(uuid) to authenticated;

-- --- Connections ---
create or replace function public.send_connection_request(
  p_target uuid, p_message text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_existing record;
  v_id uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if v_user = p_target then raise exception 'cannot connect with yourself'; end if;

  -- If there is already a connection (either direction), surface it
  select * into v_existing from public.social_connections
   where (requester_id = v_user and addressee_id = p_target)
      or (requester_id = p_target and addressee_id = v_user)
   limit 1;

  if v_existing.id is not null then
    if v_existing.status = 'accepted' then
      raise exception 'already connected';
    elsif v_existing.status = 'pending' then
      raise exception 'a request is already pending';
    else
      -- Re-open declined/cancelled requests
      update public.social_connections
        set requester_id = v_user, addressee_id = p_target,
            status = 'pending', message = p_message, created_at = now()
        where id = v_existing.id
        returning id into v_id;
      return v_id;
    end if;
  end if;

  insert into public.social_connections (requester_id, addressee_id, message)
  values (v_user, p_target, p_message)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.send_connection_request(uuid, text) to authenticated;

create or replace function public.respond_connection_request(
  p_connection_id uuid, p_accept boolean
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_addressee uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select addressee_id into v_addressee from public.social_connections where id = p_connection_id;
  if v_addressee is null then raise exception 'not found'; end if;
  if v_addressee <> v_user then raise exception 'this request is not for you'; end if;
  update public.social_connections
    set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_connection_id and status = 'pending';
end $$;
grant execute on function public.respond_connection_request(uuid, boolean) to authenticated;

create or replace function public.cancel_connection_request(p_connection_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_requester uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select requester_id into v_requester from public.social_connections where id = p_connection_id;
  if v_requester <> v_user then raise exception 'not your request to cancel'; end if;
  update public.social_connections set status = 'cancelled'
    where id = p_connection_id and status = 'pending';
end $$;
grant execute on function public.cancel_connection_request(uuid) to authenticated;

create or replace function public.remove_connection(p_other uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  delete from public.social_connections
    where status = 'accepted'
      and ((requester_id = v_user and addressee_id = p_other)
        or (requester_id = p_other and addressee_id = v_user));
end $$;
grant execute on function public.remove_connection(uuid) to authenticated;

-- --- Posts & tips ---
create or replace function public.create_post(
  p_content text, p_trip_id uuid default null,
  p_location_name text default null, p_image_url text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_trip_id is not null and not exists (
    select 1 from public.trip_members where trip_id = p_trip_id and user_id = v_user
  ) then raise exception 'not a member of that trip'; end if;
  insert into public.trip_posts (user_id, trip_id, content, location_name, image_url)
  values (v_user, p_trip_id, p_content, nullif(trim(coalesce(p_location_name,'')),''), p_image_url)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.create_post(text, uuid, text, text) to authenticated;

create or replace function public.delete_post(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  delete from public.trip_posts where id = p_id and user_id = v_user;
end $$;
grant execute on function public.delete_post(uuid) to authenticated;

create or replace function public.create_tip(
  p_location_name text, p_content text, p_category text default null,
  p_lat double precision default null, p_lng double precision default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  insert into public.travel_tips (user_id, location_name, content, category, lat, lng)
  values (v_user, p_location_name, p_content, p_category, p_lat, p_lng)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.create_tip(text, text, text, double precision, double precision) to authenticated;

create or replace function public.delete_tip(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  delete from public.travel_tips where id = p_id and user_id = v_user;
end $$;
grant execute on function public.delete_tip(uuid) to authenticated;

-- --- Discover scoring ---
create or replace function public.discover_travelers()
returns table (
  user_id          uuid,
  score            int,
  full_name        text,
  username         text,
  avatar_url       text,
  destination      text,
  start_date       date,
  end_date         date,
  travel_tags      text[],
  mutual_followers int
)
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  return query
  with my_trips as (
    select t.destination, t.start_date, t.end_date
    from public.trips t
    join public.trip_members tm on tm.trip_id = t.id
    where tm.user_id = v_user
      and t.end_date is not null and t.end_date >= current_date
  ),
  my_profile as (
    select coalesce(travel_tags, '{}'::text[]) as tags
    from public.profiles where id = v_user
  ),
  i_follow as (
    select following_id as id from public.social_follows where follower_id = v_user
  ),
  candidate_trips as (
    select t.id as trip_id, t.owner_id, t.destination, t.start_date, t.end_date
    from public.trips t
    where t.owner_id <> v_user
      and t.visibility in ('public','group')
      and t.end_date is not null and t.end_date >= current_date
      and not exists (
        select 1 from public.trip_members tm
        where tm.trip_id = t.id and tm.user_id = v_user
      )
  ),
  scored as (
    select
      ct.owner_id,
      ct.destination,
      ct.start_date,
      ct.end_date,
      -- 10 pts for exact destination match
      (case when exists (
         select 1 from my_trips mt where lower(coalesce(mt.destination,'')) = lower(coalesce(ct.destination,''))
           and coalesce(ct.destination,'') <> ''
       ) then 10 else 0 end)
      -- 1 pt per overlapping day with any of my trips
      + coalesce((
        select sum(greatest(0,
          (least(ct.end_date, mt.end_date) - greatest(ct.start_date, mt.start_date) + 1)
        ))::int from my_trips mt
        where mt.start_date is not null and mt.end_date is not null
          and ct.start_date <= mt.end_date and ct.end_date >= mt.start_date
      ), 0)
      -- 2 pts per matching travel tag
      + coalesce((
        select 2 * count(*)::int
        from public.profiles cp, my_profile mp
        where cp.id = ct.owner_id
          and cp.travel_tags && mp.tags
      ), 0)
      as score
    from candidate_trips ct
  ),
  best_per_user as (
    select distinct on (owner_id)
      owner_id, destination, start_date, end_date, score
    from scored
    order by owner_id, score desc, start_date asc
  )
  select
    bpu.owner_id,
    bpu.score,
    p.full_name,
    p.username,
    p.avatar_url,
    bpu.destination,
    bpu.start_date,
    bpu.end_date,
    coalesce(p.travel_tags, '{}'::text[]),
    -- mutual followers: count of (people i follow) who also follow this user
    coalesce((
      select count(*)::int from public.social_follows f
      where f.following_id = bpu.owner_id
        and f.follower_id in (select id from i_follow)
    ), 0) as mutual_followers
  from best_per_user bpu
  join public.profiles p on p.id = bpu.owner_id
  where bpu.score > 0
  order by bpu.score desc
  limit 25;
end $$;
grant execute on function public.discover_travelers() to authenticated;

-- Bonus helper: get feed for current user (posts + tips from people they follow + self)
create or replace function public.get_feed(p_limit int default 50)
returns table (
  kind         text,            -- 'post' | 'tip'
  id           uuid,
  user_id      uuid,
  content      text,
  location_name text,
  image_url    text,
  category     text,
  trip_id      uuid,
  created_at   timestamptz,
  full_name    text,
  username     text,
  avatar_url   text
)
language sql security definer set search_path = public as $$
  with feed_users as (
    select following_id as id from public.social_follows where follower_id = auth.uid()
    union select auth.uid()
  ),
  posts as (
    select 'post'::text as kind, tp.id, tp.user_id, tp.content,
           tp.location_name, tp.image_url, null::text as category,
           tp.trip_id, tp.created_at
    from public.trip_posts tp
    where tp.user_id in (select id from feed_users)
  ),
  tips as (
    select 'tip'::text as kind, t.id, t.user_id, t.content,
           t.location_name, null::text as image_url, t.category,
           null::uuid as trip_id, t.created_at
    from public.travel_tips t
    where t.user_id in (select id from feed_users)
  ),
  all_items as (select * from posts union all select * from tips)
  select a.kind, a.id, a.user_id, a.content, a.location_name, a.image_url, a.category,
         a.trip_id, a.created_at,
         p.full_name, p.username, p.avatar_url
  from all_items a
  join public.profiles p on p.id = a.user_id
  order by a.created_at desc
  limit p_limit;
$$;
grant execute on function public.get_feed(int) to authenticated;
