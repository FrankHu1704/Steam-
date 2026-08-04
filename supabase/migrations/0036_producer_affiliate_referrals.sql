-- Producers can also recruit affiliates: share a personal referral link
-- (/signup?pref=<producer_id>), and earn 3% of every sale that affiliate
-- generates anywhere on the platform (any product, any producer) for 1
-- month after the affiliate's account was created. Funded from PagaJá's
-- own platform fee on that sale (capped at platform_fee_amount, never
-- reduces what the affiliate or the selling producer receive) — same
-- mechanic as the existing employee-recruits-producer commission
-- (see 0025_employees.sql, applied in lib/order-fulfillment.ts).

alter table profiles add column if not exists recruited_by_producer_id uuid references profiles(id) on delete set null;

-- profiles RLS (0002_rls.sql) only lets a user read their own row (or an
-- admin read every row) — without this, a producer's "afiliados
-- recrutados" count and the affiliate's name on their commissions list
-- would silently come back empty for every producer. This adds visibility
-- scoped to exactly the affiliates a given producer recruited, nothing more.
create policy "profiles: producer reads referred affiliates" on profiles
  for select using (recruited_by_producer_id = auth.uid());

create table producer_affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  affiliate_id uuid not null references profiles(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index producer_affiliate_commissions_producer_idx on producer_affiliate_commissions (producer_id, created_at);

alter table producer_affiliate_commissions enable row level security;
create policy "producer reads own affiliate referral commissions" on producer_affiliate_commissions for select using (
  producer_id = auth.uid()
);
