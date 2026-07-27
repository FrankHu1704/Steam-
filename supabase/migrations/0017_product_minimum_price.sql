-- Raise the minimum product price to 50 MZN — below that, no fixed platform
-- fee can cover the payment processor's real per-transaction cost without
-- exceeding the sale price itself.
alter table products drop constraint if exists products_price_check;
alter table products add constraint products_price_check check (price >= 50);

alter table products drop constraint if exists products_promo_price_check;
alter table products add constraint products_promo_price_check
  check (promo_price is null or (promo_price >= 50 and promo_price < price));
