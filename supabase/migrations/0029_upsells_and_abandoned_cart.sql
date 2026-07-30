-- Post-purchase upsell: after a buyer pays for a product, offer one more
-- product from the same producer at a one-click "accept" — separate from
-- order_bumps (shown before payment) and product_bump_offers (checkout page).
create table if not exists product_upsells (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  upsell_product_id uuid not null references products(id) on delete cascade,
  custom_price numeric(12,2),
  created_at timestamptz not null default now(),
  unique (product_id)
);

alter table product_upsells enable row level security;

create policy "product_upsells: producer manages own" on product_upsells
  for all using (
    exists (
      select 1 from products
      where products.id = product_upsells.product_id
      and products.producer_id = auth.uid()
    )
  );

-- Tags an order as "this came from accepting a post-purchase upsell offer",
-- and which order it was upsold from — lets us skip showing the upsell
-- offer again on the upsell order's own confirmation page.
alter table orders add column if not exists upsell_of_order_id uuid references orders(id);

-- Abandoned-cart WhatsApp recovery: marks when a reminder was sent for a
-- still-pending order, so the cron job never messages the same order twice.
alter table orders add column if not exists abandoned_notified_at timestamptz;
