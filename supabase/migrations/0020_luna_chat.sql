-- LunaAI general chat (Dashboard -> LunaAI) — separate from the per-product
-- analysis already stored on products.ai_analysis. Keeps a short history per
-- producer so the conversation has context across messages.
create table if not exists luna_messages (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists luna_messages_producer_idx on luna_messages (producer_id, created_at);

alter table luna_messages enable row level security;

drop policy if exists "luna_messages: owner all" on luna_messages;
create policy "luna_messages: owner all" on luna_messages
  for all using (producer_id = auth.uid());
