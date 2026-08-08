-- CTO: a producer flagged is_cto=true additionally gets product moderation
-- powers and a monthly 25%-of-platform-profit share credited to their own
-- withdrawable balance, on top of their normal producer selling
-- capabilities (their profiles.role stays 'producer' throughout).

alter table profiles add column if not exists is_cto boolean not null default false;
alter table profiles add column if not exists balance_available_cto numeric(14,2) not null default 0;

-- Ledger of monthly profit-share credits (accrual events, not payments —
-- the CTO withdraws from balance_available_cto via the existing
-- withdrawals table with wallet_source='cto', same flow as producers).
create table if not exists cto_monthly_credits (
  id uuid primary key default gen_random_uuid(),
  cto_id uuid not null references profiles(id),
  amount numeric(14,2) not null,
  net_profit numeric(14,2) not null,
  period_month date not null,
  created_at timestamptz not null default now(),
  unique (cto_id, period_month)
);
alter table cto_monthly_credits enable row level security;
create policy "cto_monthly_credits: own or admin" on cto_monthly_credits
  for select using (cto_id = auth.uid() or is_admin());

create function is_cto()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and is_cto = true
  );
$$ language sql security definer stable;

-- products: let the CTO read the same rows admin can (needed for the
-- pending-approval queue) — the writes themselves still go through the
-- service-role client in lib/actions/admin.ts, gated at the app level.
drop policy if exists "products: public read approved" on products;
create policy "products: public read approved" on products
  for select using (status = 'approved' or producer_id = auth.uid() or is_admin() or is_cto());

-- profiles: CTO needs to read producer names for the products list join,
-- same bypass shape admin already has.
drop policy if exists "profiles: read own or admin" on profiles;
create policy "profiles: read own or admin" on profiles
  for select using (id = auth.uid() or is_admin() or is_cto());
