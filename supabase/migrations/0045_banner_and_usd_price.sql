-- Checkout banner (widescreen image shown above the checkout card) and an
-- optional USD price, captured now for when card/PayPal international
-- payment goes live — not processed yet, display/storage only.

alter table products add column if not exists checkout_banner_url text;
alter table products add column if not exists price_usd numeric(12,2);
