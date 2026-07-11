-- PagaJá — initial schema
-- Run via: supabase db push  (or paste into the SQL editor on supabase.com)

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('buyer', 'producer', 'admin');
create type product_status as enum ('draft', 'pending', 'approved', 'rejected', 'paused');
create type order_status as enum ('pending', 'paid', 'failed', 'refunded', 'expired');
create type payout_method as enum ('mpesa', 'emola', 'mkesh', 'bank_transfer');
create type withdrawal_status as enum ('pending', 'approved', 'rejected', 'paid', 'confirmed');
create type coupon_discount_type as enum ('percent', 'fixed');
create type commission_status as enum ('pending', 'paid');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text,
  avatar_url text,
  role user_role not null default 'buyer',
  email text not null,
  email_verified boolean not null default false,
  balance_available numeric(12,2) not null default 0,
  balance_pending numeric(12,2) not null default 0,
  currency text not null default 'MZN',
  created_at timestamptz not null default now()
);

create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  created_at timestamptz not null default now()
);

insert into categories (name, slug, icon) values
  ('eBooks', 'ebooks', 'book-open'),
  ('Cursos Online', 'cursos', 'graduation-cap'),
  ('Templates', 'templates', 'layout-template'),
  ('Presets', 'presets', 'sliders-horizontal'),
  ('Software', 'software', 'terminal-square'),
  ('Scripts', 'scripts', 'file-code'),
  ('Mentorias', 'mentorias', 'users'),
  ('Documentos', 'documentos', 'file-text');

-- ============================================================
-- PRODUCTS
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id),
  title text not null,
  slug text not null unique,
  description text not null default '',
  cover_image_url text,
  video_url text,
  price numeric(12,2) not null check (price > 0),
  promo_price numeric(12,2) check (promo_price is null or promo_price < price),
  currency text not null default 'MZN',
  affiliate_enabled boolean not null default false,
  affiliate_commission_percent numeric(5,2) not null default 20,
  status product_status not null default 'draft',
  rejection_reason text,
  seo_title text,
  seo_description text,
  view_count integer not null default 0,
  sales_count integer not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

create index products_producer_idx on products (producer_id);
create index products_status_idx on products (status);
create index products_category_idx on products (category_id);

-- Private digital files delivered only after a paid order (never public)
create table product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  storage_path text not null,
  size_bytes bigint not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- COUPONS
-- ============================================================
create table coupons (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade, -- null = all producer's products
  code text not null,
  discount_type coupon_discount_type not null,
  discount_value numeric(12,2) not null check (discount_value > 0),
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (producer_id, code)
);

-- ============================================================
-- ORDERS
-- ============================================================
create table orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  producer_id uuid not null references profiles(id),
  buyer_id uuid references profiles(id), -- null for guest checkout
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  amount numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  coupon_id uuid references coupons(id),
  total_amount numeric(12,2) not null,
  currency text not null default 'MZN',
  status order_status not null default 'pending',
  payment_method text,
  affiliate_id uuid,
  affiliate_commission_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  credited_at timestamptz -- idempotency guard for ledger credit
);

create index orders_producer_idx on orders (producer_id);
create index orders_buyer_idx on orders (buyer_id);
create index orders_product_idx on orders (product_id);

-- Order bumps: extra products added at checkout time, one row per bump taken
create table order_bumps (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  bump_product_id uuid not null references products(id),
  price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PAYMENTS (provider-level record; one order can retry across attempts)
-- ============================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null default 'debito_pay',
  provider_payment_id text,
  reference text,
  checkout_url text,
  status order_status not null default 'pending',
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_provider_payment_idx on payments (provider_payment_id);

-- ============================================================
-- DOWNLOADS (signed, time-limited access grants after a paid order)
-- ============================================================
create table downloads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_file_id uuid not null references product_files(id) on delete cascade,
  download_token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  downloaded_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AFFILIATES
-- ============================================================
create table affiliates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  affiliate_id uuid not null references profiles(id) on delete cascade,
  code text not null unique default substr(md5(random()::text), 1, 8),
  commission_percent numeric(5,2) not null,
  clicks integer not null default 0,
  sales integer not null default 0,
  commission_earned numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, affiliate_id)
);

alter table orders
  add constraint orders_affiliate_fk foreign key (affiliate_id) references affiliates(id);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_row_id uuid not null references affiliates(id) on delete cascade,
  order_id uuid not null references orders(id),
  amount numeric(12,2) not null,
  status commission_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ============================================================
-- WITHDRAWALS
-- ============================================================
create table withdrawals (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  fee_amount numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null,
  currency text not null default 'MZN',
  payout_method payout_method not null,
  destination text not null,
  status withdrawal_status not null default 'pending',
  rejection_reason text,
  payout_reference text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id),
  paid_at timestamptz,
  confirmed_at timestamptz
);

create index withdrawals_producer_idx on withdrawals (producer_id);

-- ============================================================
-- REVIEWS
-- ============================================================
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  order_id uuid not null references orders(id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, read);

-- ============================================================
-- SETTINGS (platform-wide config: fees, banners, etc.)
-- ============================================================
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into settings (key, value) values
  ('withdrawal_fee_percent', '5'),
  ('platform_fee_percent', '0'),
  ('banners', '[]');

-- ============================================================
-- LOGS (admin audit trail)
-- ============================================================
create table logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  target_table text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
