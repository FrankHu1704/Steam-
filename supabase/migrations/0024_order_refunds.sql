-- Idempotency guard for the balance clawback below — mirrors credited_at.
alter table orders add column if not exists refunded_at timestamptz;
