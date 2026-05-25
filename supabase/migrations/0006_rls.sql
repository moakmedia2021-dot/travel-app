-- Row Level Security: lock down every public table.
--
-- Helpers run as SECURITY DEFINER so they bypass RLS when checking membership.
-- Without this, a policy on trips that reads trip_members would recurse into
-- the trip_members policy and fail.

create or replace function public.is_trip_member(_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = _trip_id and user_id = auth.uid()
  );
$$;

create or replace function public.trip_role(_trip_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.trip_members
  where trip_id = _trip_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_edit_trip(_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.trip_role(_trip_id) in ('owner','editor');
$$;

revoke all on function public.is_trip_member(uuid) from public;
revoke all on function public.trip_role(uuid)      from public;
revoke all on function public.can_edit_trip(uuid)  from public;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.trip_role(uuid)      to authenticated;
grant execute on function public.can_edit_trip(uuid)  to authenticated;


-- =============================================================
-- profiles
-- =============================================================
alter table public.profiles enable row level security;

-- Anyone signed in can read profiles (needed to show member names/avatars).
-- Tighten this later if you want stricter privacy.
create policy "profiles: read all (authenticated)"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: insert own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: delete own"
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());


-- =============================================================
-- trips
-- =============================================================
alter table public.trips enable row level security;

create policy "trips: members can read"
  on public.trips for select
  to authenticated
  using (
    visibility = 'public'
    or public.is_trip_member(id)
  );

create policy "trips: owner inserts own"
  on public.trips for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "trips: owner/editor can update"
  on public.trips for update
  to authenticated
  using (public.can_edit_trip(id))
  with check (public.can_edit_trip(id));

create policy "trips: only owner can delete"
  on public.trips for delete
  to authenticated
  using (public.trip_role(id) = 'owner');


-- =============================================================
-- trip_members
-- =============================================================
alter table public.trip_members enable row level security;

-- Members can see the membership roster of trips they belong to.
-- We check trip_members directly here (same table), which is fine because
-- the SELECT inside the policy still runs under the same user's context —
-- it just filters by user_id = auth.uid() to find at least one matching row.
create policy "trip_members: members read roster"
  on public.trip_members for select
  to authenticated
  using (public.is_trip_member(trip_id));

-- Only the trip owner can add/remove/promote members.
create policy "trip_members: owner manages roster"
  on public.trip_members for insert
  to authenticated
  with check (public.trip_role(trip_id) = 'owner');

create policy "trip_members: owner updates roles"
  on public.trip_members for update
  to authenticated
  using (public.trip_role(trip_id) = 'owner')
  with check (public.trip_role(trip_id) = 'owner');

-- Owner can remove anyone; members can remove themselves (leave the trip).
create policy "trip_members: owner or self can remove"
  on public.trip_members for delete
  to authenticated
  using (
    public.trip_role(trip_id) = 'owner'
    or user_id = auth.uid()
  );


-- =============================================================
-- itinerary_items
-- =============================================================
alter table public.itinerary_items enable row level security;

create policy "itinerary: members read"
  on public.itinerary_items for select
  to authenticated
  using (public.is_trip_member(trip_id));

create policy "itinerary: owner/editor insert"
  on public.itinerary_items for insert
  to authenticated
  with check (public.can_edit_trip(trip_id));

create policy "itinerary: owner/editor update"
  on public.itinerary_items for update
  to authenticated
  using (public.can_edit_trip(trip_id))
  with check (public.can_edit_trip(trip_id));

create policy "itinerary: owner/editor delete"
  on public.itinerary_items for delete
  to authenticated
  using (public.can_edit_trip(trip_id));


-- =============================================================
-- expenses
-- =============================================================
alter table public.expenses enable row level security;

create policy "expenses: members read"
  on public.expenses for select
  to authenticated
  using (public.is_trip_member(trip_id));

-- Any trip member can log an expense, but they must claim they paid it themselves.
create policy "expenses: members insert as payer"
  on public.expenses for insert
  to authenticated
  with check (
    public.is_trip_member(trip_id)
    and paid_by = auth.uid()
  );

-- Edits by the payer or by a trip owner/editor.
create policy "expenses: payer or owner/editor updates"
  on public.expenses for update
  to authenticated
  using (paid_by = auth.uid() or public.can_edit_trip(trip_id))
  with check (paid_by = auth.uid() or public.can_edit_trip(trip_id));

create policy "expenses: payer or owner/editor deletes"
  on public.expenses for delete
  to authenticated
  using (paid_by = auth.uid() or public.can_edit_trip(trip_id));


-- =============================================================
-- expense_splits
-- =============================================================
alter table public.expense_splits enable row level security;

-- A split row inherits its trip via expense_id; members of that trip can read.
create policy "expense_splits: members read"
  on public.expense_splits for select
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_trip_member(e.trip_id)
    )
  );

-- The payer of the expense or a trip owner/editor manages splits.
create policy "expense_splits: payer or owner/editor writes"
  on public.expense_splits for insert
  to authenticated
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and (e.paid_by = auth.uid() or public.can_edit_trip(e.trip_id))
    )
  );

create policy "expense_splits: payer or owner/editor updates"
  on public.expense_splits for update
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and (e.paid_by = auth.uid() or public.can_edit_trip(e.trip_id))
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and (e.paid_by = auth.uid() or public.can_edit_trip(e.trip_id))
    )
  );

-- Users can mark *their own* split as settled even if they're not the payer.
create policy "expense_splits: settle own"
  on public.expense_splits for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "expense_splits: payer or owner/editor deletes"
  on public.expense_splits for delete
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and (e.paid_by = auth.uid() or public.can_edit_trip(e.trip_id))
    )
  );
