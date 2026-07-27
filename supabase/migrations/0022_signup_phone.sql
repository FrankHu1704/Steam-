-- Capture the phone number at signup (from auth.users.raw_user_meta_data)
-- so Tsemba SMS/WhatsApp sale notifications work from day one, instead of
-- relying on the producer adding it later in Definições.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;
