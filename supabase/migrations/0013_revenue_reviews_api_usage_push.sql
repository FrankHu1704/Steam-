-- Batch migration for four features:
--   1. Platform fee tracking on orders (for the admin revenue dashboard)
--   2. Reviews insert policy (buyers can leave a review on their own orders)
--   3. Admin visibility into API keys + a call-log table for API usage
--   4. Push subscriptions table for real web push notifications

-- ---------- 1. Platform revenue ----------
alter table orders add column platform_fee_amount numeric(12,2);

-- ---------- 2. Reviews ----------
create policy "reviews: buyer insert own" on reviews
  for insert with check (buyer_id = auth.uid());

-- ---------- 3. API usage ----------
create policy "api_keys: admin read all" on api_keys
  for select using (is_admin());

create table api_call_logs (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid references profiles(id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code integer not null,
  created_at timestamptz not null default now()
);

create index api_call_logs_producer_idx on api_call_logs(producer_id);
create index api_call_logs_created_idx on api_call_logs(created_at);

alter table api_call_logs enable row level security;

create policy "api_call_logs: admin read" on api_call_logs
  for select using (is_admin());
-- Inserts happen only via the service-role client (the /api/v1/* route
-- handlers), same pattern as orders/payments/logs.

-- ---------- 4. Push notifications ----------
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions: owner manages own" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
