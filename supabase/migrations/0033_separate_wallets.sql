-- Separates the "Pagar API" (developer/programador) revenue from regular
-- marketplace product sales: each order is tagged with where it came from,
-- and producers get a second balance that only API-originated charges
-- credit into. Withdrawals record which wallet they were paid out from.
alter table orders add column if not exists source text not null default 'marketplace';
alter table profiles add column if not exists balance_available_dev numeric not null default 0;
alter table withdrawals add column if not exists wallet_source text not null default 'producer';
