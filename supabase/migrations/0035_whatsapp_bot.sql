-- Conversation history for the PagaJá WhatsApp assistant. Keyed by phone
-- number only (no Supabase Auth user involved — anyone can message the
-- WhatsApp number, logged in or not), so this is accessed exclusively via
-- the service-role admin client, same as the `logs` table.
create table if not exists whatsapp_bot_messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_bot_messages_phone_idx on whatsapp_bot_messages (phone, created_at);
