-- Home airport IATA code on user profile, used to pre-fill flight searches.
alter table public.profiles
  add column home_airport char(3);
