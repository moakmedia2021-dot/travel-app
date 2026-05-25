-- profiles: extends auth.users with public profile data
-- A row is auto-created via trigger whenever a user signs up.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  full_name   text,
  avatar_url  text,
  bio         text,
  home_city   text,
  created_at  timestamptz not null default now(),

  constraint username_length check (username is null or char_length(username) between 3 and 32),
  constraint username_format check (username is null or username ~ '^[a-z0-9_]+$')
);

create index profiles_username_idx on public.profiles (username);

-- Auto-create a profile row for every new auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
