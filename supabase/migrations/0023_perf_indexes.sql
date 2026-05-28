-- Performance indexes for production. All are CONCURRENTLY safe to apply
-- on a live DB, and use IF NOT EXISTS so re-running is a no-op.
--
-- A few existed already from earlier migrations; the others are new.

-- trips
create index if not exists idx_trips_owner       on public.trips (owner_id);
create index if not exists idx_trips_visibility  on public.trips (visibility);
create index if not exists idx_trips_status      on public.trips (status);

-- trip_members
create index if not exists idx_trip_members_user on public.trip_members (user_id);

-- itinerary_items
create index if not exists idx_itinerary_trip    on public.itinerary_items (trip_id);

-- expenses
create index if not exists idx_expenses_trip     on public.expenses (trip_id);

-- social_follows
create index if not exists idx_social_follows_follower  on public.social_follows (follower_id);
create index if not exists idx_social_follows_following on public.social_follows (following_id);

-- trip_posts (composite, supports feed queries)
create index if not exists idx_trip_posts_user
  on public.trip_posts (user_id, created_at desc);

-- trip_invites (faster pending invite lookups)
create index if not exists idx_trip_invites_user_pending
  on public.trip_invites (user_id, status)
  where status = 'pending';

-- profiles (admin queries by created_at)
create index if not exists idx_profiles_created_at
  on public.profiles (created_at desc);
