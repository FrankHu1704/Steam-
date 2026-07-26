-- Public developer API for producers: OAuth client-credentials keys,
-- opaque access tokens, and an outgoing sale webhook — mirrors the shape
-- of external gateway APIs (products/offers/orders/webhooks) so producers
-- can integrate PagaJá with their own tools. Actual payment processing
-- keeps using Debito Pay under the hood; this is read/manage access to a
-- producer's own PagaJá data.

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  label text not null default 'Chave de API',
  client_id text not null unique,
  client_secret_hash text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table api_access_tokens (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references api_keys(id) on delete cascade,
  producer_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table developer_webhooks (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null unique references profiles(id) on delete cascade,
  url text not null,
  secret text not null,
  events jsonb not null default '["payment.completed"]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index api_access_tokens_expires_at_idx on api_access_tokens(expires_at);

alter table api_keys enable row level security;
alter table api_access_tokens enable row level security;
alter table developer_webhooks enable row level security;

create policy "api_keys: producer manages own" on api_keys
  for all using (producer_id = auth.uid()) with check (producer_id = auth.uid());

-- api_access_tokens has no client policies: only the service-role client
-- (used by the /api/v1/* route handlers) may read or write it.

create policy "developer_webhooks: producer manages own" on developer_webhooks
  for all using (producer_id = auth.uid()) with check (producer_id = auth.uid());
