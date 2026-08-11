-- Facebook Conversions API: server-side "Purchase" event, deduplicated with
-- the browser Pixel (already set up per-product via products.facebook_pixel_id
-- + lib/pixels.ts) via a shared event_id (= orders.id).

-- The access token is a real secret — kept in its own table so it can never
-- be swept up by a `select("*")` on `products`, which the public checkout
-- page (app/p/[slug]/page.tsx) does today.
create table if not exists product_capi_configs (
  product_id uuid primary key references products(id) on delete cascade,
  fb_access_token text not null,
  updated_at timestamptz not null default now()
);

alter table product_capi_configs enable row level security;

drop policy if exists "owner manages own capi config" on product_capi_configs;
create policy "owner manages own capi config" on product_capi_configs
  for all
  using (exists (select 1 from products where products.id = product_capi_configs.product_id and products.producer_id = auth.uid()))
  with check (exists (select 1 from products where products.id = product_capi_configs.product_id and products.producer_id = auth.uid()));

-- Captured once at checkout time so the server-side Purchase event can match
-- the browser Pixel event as closely as possible — IP/UA/fbp/fbc all feed
-- Facebook's own event-matching, on top of the shared event_id dedup.
alter table orders add column if not exists client_ip text;
alter table orders add column if not exists client_user_agent text;
alter table orders add column if not exists fbp text;
alter table orders add column if not exists fbc text;
