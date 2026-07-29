-- Order bump becomes producer-controlled: a toggle per product, plus an
-- explicit list of which other products of theirs are offered as the bump
-- (instead of the checkout picking any 2 other approved products at random).
alter table products add column if not exists bump_enabled boolean not null default false;

create table if not exists product_bump_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  bump_product_id uuid not null references products(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, bump_product_id)
);

alter table product_bump_offers enable row level security;

create policy "product_bump_offers: producer manages own" on product_bump_offers
  for all using (
    exists (
      select 1 from products
      where products.id = product_bump_offers.product_id
      and products.producer_id = auth.uid()
    )
  );
