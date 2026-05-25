-- Pending invitations to join a trip.
-- The invite may be addressed to an existing user (by user_id) or to an
-- email we haven't seen yet (user_id null). On acceptance, user_id is
-- filled in with the accepting user.

create table public.trip_invites (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  invited_by  uuid not null references public.profiles(id) on delete cascade,
  email       text not null,
  user_id     uuid references public.profiles(id) on delete set null,
  role        text not null check (role in ('editor','viewer')),
  token       uuid not null unique default gen_random_uuid(),
  status      text not null default 'pending'
                check (status in ('pending','accepted','declined','expired','cancelled')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days')
);

create index trip_invites_trip_idx   on public.trip_invites (trip_id);
create index trip_invites_email_idx  on public.trip_invites (lower(email));
create index trip_invites_user_idx   on public.trip_invites (user_id);
create index trip_invites_status_idx on public.trip_invites (status);

alter table public.trip_invites enable row level security;

-- Read: trip members can see invites for the trip, and the invited user can see their own
create policy "invites: members or invitee can read"
  on public.trip_invites for select
  to authenticated
  using (
    public.is_trip_member(trip_id)
    or user_id = auth.uid()
    or lower(email) = lower((select u.email::text from auth.users u where u.id = auth.uid()))
  );

-- All writes go through SECURITY DEFINER RPCs, so no permissive write policies needed.
