-- Saved payout wallets (M-Pesa / e-Mola) so producers pick a saved wallet
-- instead of retyping the phone number on every withdrawal request.
-- One wallet per method per producer (max 2 total: 1 M-Pesa + 1 e-Mola).
create table if not exists payout_wallets (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  method text not null check (method in ('mpesa', 'emola')),
  holder_name text not null,
  phone text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (producer_id, method)
);

create index if not exists payout_wallets_producer_idx on payout_wallets (producer_id);

-- At most one default wallet per producer.
drop index if exists payout_wallets_one_default_idx;
create unique index payout_wallets_one_default_idx on payout_wallets (producer_id) where (is_default);

alter table payout_wallets enable row level security;

drop policy if exists "payout_wallets: owner all" on payout_wallets;
create policy "payout_wallets: owner all" on payout_wallets
  for all using (producer_id = auth.uid());
