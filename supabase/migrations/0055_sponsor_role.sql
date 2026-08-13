-- Sponsor: any profile (buyer or producer — a sponsor doesn't need to
-- sell anything) can be flagged is_sponsor=true with an admin-defined
-- share percentage, earning that % of PayNow's platform net profit each
-- month, credited to its own withdrawable balance. Mirrors the CTO
-- profit-share mechanism (0041_cto_role.sql) but with a per-sponsor
-- percentage instead of a fixed 25%, and a contract start date — a
-- sponsor only starts accruing from sponsor_contract_started_at onward,
-- never retroactively on profit generated before their contract began
-- (see getPlatformNetProfitForRange() in lib/cto.ts and
-- creditMonthlySponsorShare() in lib/sponsor.ts).
alter table profiles add column if not exists is_sponsor boolean not null default false;
alter table profiles add column if not exists sponsor_share_percent numeric(5,2);
alter table profiles add column if not exists sponsor_contract_started_at timestamptz;
alter table profiles add column if not exists balance_available_sponsor numeric(14,2) not null default 0;

-- Ledger of monthly profit-share credits (accrual events, not payments —
-- the sponsor withdraws from balance_available_sponsor via the existing
-- withdrawals table with wallet_source='sponsor', same flow as producers
-- and CTOs).
create table if not exists sponsor_monthly_credits (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references profiles(id),
  amount numeric(14,2) not null,
  net_profit numeric(14,2) not null,
  share_percent numeric(5,2) not null,
  period_month date not null,
  created_at timestamptz not null default now(),
  unique (sponsor_id, period_month)
);
alter table sponsor_monthly_credits enable row level security;
create policy "sponsor_monthly_credits: own or admin" on sponsor_monthly_credits
  for select using (sponsor_id = auth.uid() or is_admin());
