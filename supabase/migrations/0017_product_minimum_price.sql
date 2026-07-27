-- Raise the minimum product price to 50 MZN — below that, no fixed platform
-- fee can cover the payment processor's real per-transaction cost without
-- exceeding the sale price itself.
--
-- NOT VALID: only enforced for new inserts/updates going forward — any
-- existing product already priced below 50 MT keeps selling as-is rather
-- than blocking this migration. Run the SELECT at the bottom to find those.
alter table products drop constraint if exists products_price_check;
alter table products add constraint products_price_check check (price >= 50) not valid;

alter table products drop constraint if exists products_promo_price_check;
alter table products add constraint products_promo_price_check
  check (promo_price is null or (promo_price >= 50 and promo_price < price)) not valid;

-- select id, title, price, promo_price from products where price < 50 or promo_price < 50;
