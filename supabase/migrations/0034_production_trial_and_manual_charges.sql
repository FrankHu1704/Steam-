-- Lets a producer try live-mode API charges for free for 24h before
-- committing to the 300 MT permanent unlock (production_unlocked_at stays
-- the permanent path; this is a separate, one-time, free trial window).
alter table profiles add column if not exists production_access_expires_at timestamptz;

-- Lets the developer API charge an arbitrary amount without a pre-created
-- PagaJá product (a "manual" charge) — mirrors how most payment-gateway
-- APIs work (amount + description) instead of requiring a product record.
alter table orders alter column product_id drop not null;
alter table orders add column if not exists description text;
