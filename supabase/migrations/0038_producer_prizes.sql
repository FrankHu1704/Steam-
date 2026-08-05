-- Physical-prize milestones based on lifetime revenue ("faturamento"),
-- separate from the sales-count achievement badges in
-- lib/data/achievements.ts. lifetime_revenue is a denormalized running
-- total (same pattern as lifetime_sales_count), updated in
-- lib/order-fulfillment.ts alongside the sale count. Each threshold is its
-- own prize a producer keeps earning as they cross it — reaching 1M MT
-- means they've also earned the 25k/100k/500k prizes, tracked separately
-- since each is a distinct physical item the admin ships out by hand.

alter table profiles add column if not exists lifetime_revenue numeric(14,2) not null default 0;

create table producer_prize_deliveries (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  tier_key text not null,
  delivered_at timestamptz not null default now(),
  delivered_by uuid references profiles(id),
  notes text,
  unique (producer_id, tier_key)
);

alter table producer_prize_deliveries enable row level security;

create policy "producer_prize_deliveries: producer reads own" on producer_prize_deliveries
  for select using (producer_id = auth.uid());

create policy "producer_prize_deliveries: admin manages all" on producer_prize_deliveries
  for all using (is_admin()) with check (is_admin());
