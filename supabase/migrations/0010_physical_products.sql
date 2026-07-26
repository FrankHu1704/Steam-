-- Support for physical/dropshipping products alongside digital ones.
-- Simple model: a producer lists a physical product with stock, the buyer
-- gives a shipping address at checkout, and the producer marks the order's
-- shipping progress from their dashboard. Fulfillment itself (sourcing,
-- packing, courier) happens off-platform, same as any direct-to-consumer
-- seller — PagaJá just tracks the order and the delivery status.

create type product_type as enum ('digital', 'physical');
create type shipping_status as enum ('pending', 'processing', 'shipped', 'delivered', 'returned');

alter table products
  add column product_type product_type not null default 'digital',
  add column stock_quantity integer;

alter table orders
  add column shipping_address text,
  add column shipping_city text,
  add column shipping_province text,
  add column shipping_status shipping_status,
  add column tracking_reference text;
