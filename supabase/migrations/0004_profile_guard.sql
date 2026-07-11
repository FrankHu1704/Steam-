-- The "profiles: update own" RLS policy allows a user to update their own
-- row, but doesn't restrict *which* columns — without this trigger, any
-- signed-in user could call supabase.from('profiles').update({role:'admin'})
-- directly from the browser and self-promote, or tamper with their own
-- ledger balances. Regular authenticated sessions get those fields reset
-- to their previous value; the service-role client (used by admin actions
-- and the payment webhook) bypasses RLS entirely and is unaffected.

create function guard_profile_updates()
returns trigger as $$
begin
  if auth.role() = 'authenticated' then
    -- Buyers may self-upgrade to producer, but never to admin.
    if new.role = 'admin' and old.role <> 'admin' then
      new.role := old.role;
    end if;
    -- Ledger balances are only ever written by server-side code
    -- (webhook, withdrawal actions) using the service-role client.
    new.balance_available := old.balance_available;
    new.balance_pending := old.balance_pending;
    new.email_verified := old.email_verified;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger profiles_guard_updates
  before update on profiles
  for each row execute procedure guard_profile_updates();
