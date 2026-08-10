-- One-time SMS codes required before a withdrawal (producer or CTO wallet)
-- is actually processed. Only ever touched via the service-role client from
-- server actions (lib/withdrawal-otp.ts) — no client-side access, so RLS
-- stays default-deny.
create table if not exists withdrawal_otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists withdrawal_otp_codes_user_id_idx on withdrawal_otp_codes (user_id);

alter table withdrawal_otp_codes enable row level security;
