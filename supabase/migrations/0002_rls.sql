-- Row Level Security policies for every table.

alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_files enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;
alter table order_bumps enable row level security;
alter table payments enable row level security;
alter table downloads enable row level security;
alter table affiliates enable row level security;
alter table commissions enable row level security;
alter table withdrawals enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;
alter table settings enable row level security;
alter table logs enable row level security;

create function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ---------- profiles ----------
create policy "profiles: read own or admin" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles: update own" on profiles
  for update using (id = auth.uid());

-- ---------- categories (public read, admin write) ----------
create policy "categories: public read" on categories
  for select using (true);
create policy "categories: admin write" on categories
  for all using (is_admin());

-- ---------- products ----------
create policy "products: public read approved" on products
  for select using (status = 'approved' or producer_id = auth.uid() or is_admin());
create policy "products: producer insert own" on products
  for insert with check (producer_id = auth.uid());
create policy "products: producer update own draft fields" on products
  for update using (producer_id = auth.uid() or is_admin());
create policy "products: producer delete own" on products
  for delete using (producer_id = auth.uid() or is_admin());

-- ---------- product_files (never public; owner + admin only, buyers get
-- signed URLs via a server-side route instead of querying this table) ----------
create policy "product_files: owner/admin" on product_files
  for all using (
    exists (select 1 from products p where p.id = product_id and p.producer_id = auth.uid())
    or is_admin()
  );

-- ---------- coupons ----------
create policy "coupons: producer manage own" on coupons
  for all using (producer_id = auth.uid() or is_admin());
create policy "coupons: public read active for validation" on coupons
  for select using (active = true);

-- ---------- orders ----------
create policy "orders: buyer/producer/admin read" on orders
  for select using (buyer_id = auth.uid() or producer_id = auth.uid() or is_admin());
-- Inserts/updates happen only via server actions using the service-role
-- client (checkout, webhook), so no direct client insert/update policy.

-- ---------- order_bumps ----------
create policy "order_bumps: via parent order" on order_bumps
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or o.producer_id = auth.uid() or is_admin())
    )
  );

-- ---------- payments ----------
create policy "payments: via parent order" on payments
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or o.producer_id = auth.uid() or is_admin())
    )
  );

-- ---------- downloads ----------
create policy "downloads: via parent order" on downloads
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or is_admin())
    )
  );

-- ---------- affiliates ----------
create policy "affiliates: affiliate/owner/admin read" on affiliates
  for select using (
    affiliate_id = auth.uid()
    or is_admin()
    or exists (select 1 from products p where p.id = product_id and p.producer_id = auth.uid())
  );

-- ---------- commissions ----------
create policy "commissions: via affiliate row" on commissions
  for select using (
    exists (
      select 1 from affiliates a
      where a.id = affiliate_row_id and (a.affiliate_id = auth.uid() or is_admin())
    )
  );

-- ---------- withdrawals ----------
create policy "withdrawals: producer/admin read" on withdrawals
  for select using (producer_id = auth.uid() or is_admin());

-- ---------- reviews ----------
create policy "reviews: public read" on reviews
  for select using (true);
create policy "reviews: buyer insert own" on reviews
  for insert with check (buyer_id = auth.uid());

-- ---------- notifications ----------
create policy "notifications: own only" on notifications
  for select using (user_id = auth.uid());
create policy "notifications: mark own read" on notifications
  for update using (user_id = auth.uid());

-- ---------- settings ----------
create policy "settings: public read" on settings
  for select using (true);
create policy "settings: admin write" on settings
  for all using (is_admin());

-- ---------- logs (admin only) ----------
create policy "logs: admin read" on logs
  for select using (is_admin());
