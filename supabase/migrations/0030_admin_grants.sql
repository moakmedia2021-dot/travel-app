-- =====================================================================
-- Grantable admin access.
--   * Env ADMIN_USER_IDS remain the un-revokable "root" admins.
--   * admin_users holds runtime-granted admins (granted from the admin
--     Users tab, password-confirmed).
--   * Access is read/written only via service-role server actions, so RLS
--     is enabled with NO policies (deny-all to normal clients).
-- =====================================================================

create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- No policies on purpose: only the service role (server actions) may touch it.
