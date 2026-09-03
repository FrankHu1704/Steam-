-- One-off "pay off your negative balance" charges (see the debt card on
-- /dashboard and requestDebtPayment() in lib/actions/debt.ts). Mirrors
-- production_unlocks: created pending with a provider_payment_id, then
-- the client-side poll (checkDebtPaymentStatus) confirms it via the same
-- provider.checkChargeStatus() every other one-off charge already uses,
-- and completeDebtPayment() (lib/debt-fulfillment.ts) credits the paid
-- amount straight onto the wallet it was raised against — no platform
-- fee, this isn't a sale.
create table debt_payments (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  wallet_field text not null default 'balance_available',
  amount numeric(12,2) not null,
  currency text not null default 'MZN',
  provider text not null,
  provider_payment_id text,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);

create index debt_payments_producer_idx on debt_payments (producer_id, status);

alter table debt_payments enable row level security;
