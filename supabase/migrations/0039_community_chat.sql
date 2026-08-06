-- Open community chat: one shared room, every logged-in account
-- (producer, buyer, admin) can read and post. user_name/user_role are
-- denormalized snapshots at send time — avoids needing a broader profiles
-- read policy just to show a display name (profiles RLS only lets a user
-- read their own row, see 0002_rls.sql), and is the standard tradeoff for
-- chat history (a later name change doesn't rewrite old messages).

create table community_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  user_name text not null,
  user_role text not null,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index community_chat_messages_created_at_idx on community_chat_messages (created_at);

alter table community_chat_messages enable row level security;

create policy "community_chat: any authenticated user reads" on community_chat_messages
  for select using (auth.uid() is not null);

create policy "community_chat: user posts own message" on community_chat_messages
  for insert with check (user_id = auth.uid());

create policy "community_chat: admin deletes any" on community_chat_messages
  for delete using (is_admin());

-- Needed for the client to receive new messages live via Supabase Realtime.
alter publication supabase_realtime add table community_chat_messages;
