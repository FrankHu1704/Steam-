-- Support bubble (floating chat, visible on every page inside the app
-- shell) — separate from luna_messages (LunaAI's marketing-advice chat):
-- this one answers "how do I use PagaJá" questions and is available to
-- every role (producer/admin/colaborador/buyer), not just producers.
create table if not exists support_bot_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_bot_messages_user_idx on support_bot_messages (user_id, created_at);

alter table support_bot_messages enable row level security;

drop policy if exists "support_bot_messages: owner all" on support_bot_messages;
create policy "support_bot_messages: owner all" on support_bot_messages
  for all using (user_id = auth.uid());
