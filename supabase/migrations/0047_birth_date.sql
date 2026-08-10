-- Captures date of birth at signup (light KYC, matches what most local
-- payment/marketplace apps ask). No hard unique constraint on phone here —
-- some existing accounts may already share/lack a phone number, and a
-- migration that fails on real data is worse than the app-level check
-- already added in signUp() (lib/actions/auth.ts) before account creation.

alter table profiles add column if not exists birth_date date;

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, phone, birth_date)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'birth_date', '')::date
  );
  return new;
end;
$$ language plpgsql security definer;
