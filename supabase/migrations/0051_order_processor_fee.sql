-- The processor's own commission per sale (e.g. NetShop's "fee" on each
-- charge) — a real cost that Admin -> Receita never subtracted before,
-- only our own platform_fee_amount revenue. See lib/actions/checkout.ts's
-- recordProcessorFee() for where this gets populated (NetShop-confirmed
-- only for now; other providers' charge responses haven't been checked
-- for an equivalent field).
alter table orders add column if not exists processor_fee_amount numeric(12,2);
