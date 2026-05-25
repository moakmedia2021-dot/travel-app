-- Add travelers count to trips (collected in the create-trip flow).
alter table public.trips
  add column travelers int check (travelers is null or travelers >= 1);
