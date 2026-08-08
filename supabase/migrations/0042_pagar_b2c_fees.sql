-- Tracks the extra fee a payment processor charges PagaJá when dispatching
-- a B2C payout (currently only Pagar reports this back — 8% on e-Mola
-- payouts, absorbed into PagaJá's margin rather than the recipient's
-- amount). Feeds into getPlatformRevenue()'s withdrawalFees bucket so it
-- counts as a real cost instead of silently disappearing.

alter table withdrawals add column if not exists provider_fee_amount numeric(14,2) not null default 0;
alter table employee_payouts add column if not exists provider_fee_amount numeric(14,2) not null default 0;
