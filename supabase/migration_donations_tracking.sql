-- Corre isto no SQL Editor do teu projeto Supabase.

create extension if not exists pgcrypto;

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  reference text,
  amount numeric not null,
  net_amount numeric,
  currency text not null default 'MZN',
  method text,
  status text not null default 'pending', -- pending | success | failed
  donor_name text,
  donor_email text,
  donor_phone text,
  client_ip_hash text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists donations_created_at_idx on donations (created_at desc);
create index if not exists donations_status_idx on donations (status);
create index if not exists donations_external_id_idx on donations (external_id);

alter table donations enable row level security;
-- De propósito: nenhuma policy criada. Só o service_role (usado pelas funções
-- serverless em api/) consegue ler/escrever. A anon key do browser nunca deve
-- tocar nesta tabela directamente.

create table if not exists page_events (
  id bigint generated always as identity primary key,
  path text not null,
  event text not null default 'pageview',
  label text,
  ip_hash text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists page_events_created_at_idx on page_events (created_at desc);
create index if not exists page_events_event_idx on page_events (event);

alter table page_events enable row level security;
-- Idem: sem policies, só acessível via service_role.
