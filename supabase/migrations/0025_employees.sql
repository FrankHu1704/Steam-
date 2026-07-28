-- Employees/collaborators (funcionários) — recruit producers via a unique
-- referral link and earn a commission on those producers' sales for a
-- limited window after recruitment. Fully separate from the `profiles`/
-- `user_role` model on purpose (no ALTER TYPE ... ADD VALUE needed, and
-- keeps this money-bearing role isolated from producer/admin permissions).

create table employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  bi_number text,
  address text,
  city text,
  province text,
  mpesa_number text,
  emola_number text,
  referral_code text not null unique,
  commission_percent numeric(5,2) not null default 5,
  active boolean not null default true,
  balance_available numeric(12,2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index employees_referral_code_idx on employees (referral_code);

alter table profiles add column if not exists recruited_by_employee_id uuid references employees(id);

create table employee_link_clicks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index employee_link_clicks_employee_idx on employee_link_clicks (employee_id, created_at);

create table employee_commissions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  producer_id uuid not null references profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index employee_commissions_employee_idx on employee_commissions (employee_id, created_at);

create table employee_payouts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  payout_reference text,
  failure_reason text,
  period_month date not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index employee_payouts_employee_period_idx on employee_payouts (employee_id, period_month);

alter table employees enable row level security;
create policy "employee reads own row" on employees for select using (user_id = auth.uid());

alter table employee_link_clicks enable row level security;
create policy "employee reads own clicks" on employee_link_clicks for select using (
  employee_id in (select id from employees where user_id = auth.uid())
);

alter table employee_commissions enable row level security;
create policy "employee reads own commissions" on employee_commissions for select using (
  employee_id in (select id from employees where user_id = auth.uid())
);

alter table employee_payouts enable row level security;
create policy "employee reads own payouts" on employee_payouts for select using (
  employee_id in (select id from employees where user_id = auth.uid())
);
