-- =====================================================================
-- Pre-launch waitlist + referral system
-- =====================================================================

create table if not exists public.waitlist (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  name              text,
  referral_code     varchar(8) not null unique,
  referred_by       varchar(8) references public.waitlist(referral_code) on delete set null,
  position          int not null,
  granted_access    boolean not null default false,
  access_granted_at timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_waitlist_referred_by  on public.waitlist (referred_by);
create index if not exists idx_waitlist_position     on public.waitlist (position);
create index if not exists idx_waitlist_email_lower  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- All writes go through SECURITY DEFINER RPCs.
-- No public select policy — reads are only via waitlist_get(code) RPC.

-- ---------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------

create or replace function public.waitlist_join(
  p_email       text,
  p_name        text,
  p_referred_by varchar default null
)
returns table (referral_code varchar, position int, already_on boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_code  varchar(8);
  v_pos   int;
  v_existing record;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  -- Already on the list? Return existing values.
  select w.referral_code, w.position into v_existing
    from public.waitlist w where w.email = v_email;
  if v_existing.referral_code is not null then
    return query select v_existing.referral_code, v_existing.position, true;
    return;
  end if;

  -- Generate a short, lowercase code (retry on collision).
  loop
    v_code := lower(substring(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.waitlist where referral_code = v_code);
  end loop;

  -- Sanitize referrer (must exist; nullify if not)
  if p_referred_by is not null and not exists (
    select 1 from public.waitlist where referral_code = p_referred_by
  ) then
    p_referred_by := null;
  end if;

  select count(*)::int + 1 into v_pos from public.waitlist;

  insert into public.waitlist (email, name, referral_code, referred_by, position)
  values (v_email, nullif(trim(coalesce(p_name, '')), ''), v_code, p_referred_by, v_pos);

  return query select v_code, v_pos, false;
end $$;
grant execute on function public.waitlist_join(text, text, varchar) to anon, authenticated;


create or replace function public.waitlist_get(p_code varchar)
returns table (
  referral_code   varchar,
  name            text,
  position        int,
  referrals_count int,
  granted_access  boolean,
  created_at      timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    w.referral_code,
    w.name,
    w.position,
    (select count(*)::int from public.waitlist r where r.referred_by = w.referral_code),
    w.granted_access,
    w.created_at
  from public.waitlist w
  where w.referral_code = p_code;
$$;
grant execute on function public.waitlist_get(varchar) to anon, authenticated;


create or replace function public.waitlist_count()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from public.waitlist;
$$;
grant execute on function public.waitlist_count() to anon, authenticated;
