-- ============================================================================
-- SMSMoz — Core schema
-- ============================================================================
create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────
create type user_role as enum ('client', 'admin');
create type account_status as enum ('pending', 'active', 'blocked');
create type sms_status as enum ('queued', 'scheduled', 'sent', 'delivered', 'failed', 'rejected');
create type sms_type as enum ('single', 'bulk', 'transactional', 'api');
create type transaction_type as enum ('purchase', 'usage', 'refund', 'bonus', 'admin_adjustment');
create type payment_method as enum ('mpesa', 'emola', 'card', 'paypal', 'stripe', 'manual');
create type payment_status as enum ('pending', 'completed', 'failed', 'cancelled');

-- ── Profiles (1:1 with auth.users) ─────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  company_name text,
  phone text,
  role user_role not null default 'client',
  status account_status not null default 'pending',
  credits numeric(14,2) not null default 0 check (credits >= 0),
  plan_id uuid,
  avatar_url text,
  two_fa_enabled boolean not null default false,
  default_sender_id text not null default 'SMSMoz',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create index profiles_status_idx on public.profiles(status);

-- ── Plans ───────────────────────────────────────────────────────────────────
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(14,2) not null default 0,
  currency text not null default 'MZN',
  credits integer not null default 0,
  price_per_sms numeric(10,4) not null default 1.5,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_popular boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_plan_fk foreign key (plan_id) references public.plans(id) on delete set null;

-- ── Promotions ──────────────────────────────────────────────────────────────
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_percent numeric(5,2) default 0,
  bonus_credits integer default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── API Keys ────────────────────────────────────────────────────────────────
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Default key',
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  is_active boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index api_keys_user_idx on public.api_keys(user_id);

-- ── Contact lists & contacts ────────────────────────────────────────────────
create table public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create index contact_lists_user_idx on public.contact_lists(user_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  list_id uuid references public.contact_lists(id) on delete set null,
  name text,
  phone text not null,
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index contacts_user_idx on public.contacts(user_id);
create index contacts_list_idx on public.contacts(list_id);
create index contacts_phone_idx on public.contacts(phone);
create index contacts_tags_idx on public.contacts using gin(tags);

-- ── SMS batches (for bulk sends) ────────────────────────────────────────────
create table public.sms_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Envio em massa',
  total_recipients integer not null default 0,
  total_cost numeric(14,2) not null default 0,
  status sms_status not null default 'queued',
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);
create index sms_batches_user_idx on public.sms_batches(user_id);

-- ── SMS messages ─────────────────────────────────────────────────────────────
create table public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  batch_id uuid references public.sms_batches(id) on delete set null,
  recipient text not null,
  sender_id text not null default 'SMSMoz',
  message text not null,
  message_type sms_type not null default 'single',
  status sms_status not null default 'queued',
  segments integer not null default 1,
  is_unicode boolean not null default false,
  is_flash boolean not null default false,
  cost numeric(10,4) not null default 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  external_id text,
  error_message text,
  created_at timestamptz not null default now()
);
create index sms_messages_user_idx on public.sms_messages(user_id);
create index sms_messages_status_idx on public.sms_messages(status);
create index sms_messages_created_idx on public.sms_messages(created_at desc);
create index sms_messages_batch_idx on public.sms_messages(batch_id);

-- ── Transactions (credits / payments) ───────────────────────────────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type transaction_type not null,
  amount numeric(14,2) not null default 0,
  credits numeric(14,2) not null default 0,
  payment_method payment_method,
  payment_status payment_status not null default 'pending',
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index transactions_user_idx on public.transactions(user_id);
create index transactions_status_idx on public.transactions(payment_status);
create index transactions_reference_idx on public.transactions(reference);

-- ── Notifications ────────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, is_read);

-- ── Audit logs ───────────────────────────────────────────────────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_idx on public.audit_logs(actor_id);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

-- ── System settings (key/value store for admin-configurable settings) ──────
create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
