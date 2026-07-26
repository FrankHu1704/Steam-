-- ZumboPay as a second payment processor (admin picks the active one via
-- settings.payment_provider), plus the "custom checkout" capability on the
-- developer API: producers can call POST /api/v1/charges to trigger a real
-- charge from their own checkout UI. Test-mode keys simulate charges for
-- free; live-mode keys require a one-time 300 MZN unlock.

-- ZumboPay is the default active processor: its API is fully documented
-- and working end-to-end (STK push, hosted card checkout, signed
-- webhooks with e-Mola PIN verification), while Debito Pay's webhook
-- signature still doesn't verify in production. Admin can flip this
-- back in Dashboard → Definições at any time.
insert into settings (key, value) values ('payment_provider', '"zumbopay"'::jsonb)
  on conflict (key) do update set value = '"zumbopay"'::jsonb;

alter table api_keys
  add column mode text not null default 'test' check (mode in ('test', 'live'));

alter table profiles
  add column production_unlocked_at timestamptz;

create table production_unlocks (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  amount numeric(12,2) not null default 300,
  currency text not null default 'MZN',
  provider text not null,
  provider_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table production_unlocks enable row level security;

create policy "production_unlocks: producer reads own" on production_unlocks
  for select using (producer_id = auth.uid());
-- Inserts/updates happen only via the service-role client (server actions),
-- same pattern as orders/payments.
