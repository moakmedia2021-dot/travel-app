-- RPC functions for expenses + splits.
-- Splits are passed as parallel arrays (user_ids[], amounts[]).
-- The function replaces all splits atomically on update.

create or replace function public.create_expense(
  p_trip_id        uuid,
  p_title          text,
  p_amount         numeric,
  p_currency       text,
  p_category       text,
  p_date           date,
  p_paid_by        uuid,
  p_split_type     text,
  p_split_user_ids uuid[],
  p_split_amounts  numeric[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
  i      int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = v_user
  ) then
    raise exception 'forbidden';
  end if;

  if coalesce(array_length(p_split_user_ids, 1), 0)
     <> coalesce(array_length(p_split_amounts, 1), 0) then
    raise exception 'split arrays must match';
  end if;

  insert into public.expenses (
    trip_id, title, amount, currency, category, split_type, date, paid_by
  ) values (
    p_trip_id, p_title, p_amount, p_currency, p_category, p_split_type, p_date, p_paid_by
  ) returning id into v_id;

  if p_split_user_ids is not null and array_length(p_split_user_ids, 1) > 0 then
    for i in 1..array_length(p_split_user_ids, 1) loop
      insert into public.expense_splits (expense_id, user_id, amount_owed)
      values (v_id, p_split_user_ids[i], p_split_amounts[i]);
    end loop;
  end if;

  return v_id;
end $$;

grant execute on function public.create_expense(
  uuid, text, numeric, text, text, date, uuid, text, uuid[], numeric[]
) to authenticated;


create or replace function public.update_expense(
  p_id             uuid,
  p_title          text,
  p_amount         numeric,
  p_currency       text,
  p_category       text,
  p_date           date,
  p_paid_by        uuid,
  p_split_type     text,
  p_split_user_ids uuid[],
  p_split_amounts  numeric[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_trip_id uuid;
  i         int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select trip_id into v_trip_id from public.expenses where id = p_id;
  if v_trip_id is null then raise exception 'not found'; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = v_trip_id and user_id = v_user
  ) then
    raise exception 'forbidden';
  end if;

  if coalesce(array_length(p_split_user_ids, 1), 0)
     <> coalesce(array_length(p_split_amounts, 1), 0) then
    raise exception 'split arrays must match';
  end if;

  update public.expenses
  set title      = p_title,
      amount     = p_amount,
      currency   = p_currency,
      category   = p_category,
      date       = p_date,
      paid_by    = p_paid_by,
      split_type = p_split_type
  where id = p_id;

  delete from public.expense_splits where expense_id = p_id;

  if p_split_user_ids is not null and array_length(p_split_user_ids, 1) > 0 then
    for i in 1..array_length(p_split_user_ids, 1) loop
      insert into public.expense_splits (expense_id, user_id, amount_owed)
      values (p_id, p_split_user_ids[i], p_split_amounts[i]);
    end loop;
  end if;
end $$;

grant execute on function public.update_expense(
  uuid, text, numeric, text, text, date, uuid, text, uuid[], numeric[]
) to authenticated;


create or replace function public.delete_expense(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_trip_id uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select trip_id into v_trip_id from public.expenses where id = p_id;
  if v_trip_id is null then return; end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = v_trip_id and user_id = v_user
  ) then
    raise exception 'forbidden';
  end if;

  delete from public.expenses where id = p_id;
end $$;

grant execute on function public.delete_expense(uuid) to authenticated;


create or replace function public.toggle_split_settled(p_split_id uuid, p_settled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_trip_id uuid;
  v_user_id uuid;
  v_paid_by uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select e.trip_id, s.user_id, e.paid_by
    into v_trip_id, v_user_id, v_paid_by
  from public.expense_splits s
  join public.expenses e on e.id = s.expense_id
  where s.id = p_split_id;

  if v_trip_id is null then raise exception 'not found'; end if;

  -- Only the person who owes the money OR the payer can mark it settled
  if v_user <> v_user_id and v_user <> v_paid_by then
    raise exception 'forbidden';
  end if;

  update public.expense_splits set settled = p_settled where id = p_split_id;
end $$;

grant execute on function public.toggle_split_settled(uuid, boolean) to authenticated;
