-- Queues a failed producer webhook delivery (see lib/developer-webhooks.ts)
-- for a daily retry (app/api/cron/webhook-retry) — Vercel's free plan only
-- allows once-a-day cron schedules, so this is "retry once a day for up to
-- 5 days", not minute/hour-scale backoff. Previously a single failed
-- delivery attempt meant the event was lost forever.

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  event text not null default 'payment.completed',
  payload jsonb not null,
  attempt_count int not null default 1,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  last_error text,
  next_attempt_at timestamptz not null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index webhook_deliveries_pending_idx on webhook_deliveries (status, next_attempt_at)
  where status = 'pending';

alter table webhook_deliveries enable row level security;

create policy "webhook_deliveries: producer reads own" on webhook_deliveries
  for select using (producer_id = auth.uid());

create policy "webhook_deliveries: admin reads all" on webhook_deliveries
  for select using (is_admin());
