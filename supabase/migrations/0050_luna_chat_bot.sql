-- LunaAI can now post in the community chat (mentioned via "@LunaAI") — her
-- messages have no real profiles row behind them, so user_id must be
-- nullable. The FK stays intact for every real (non-null) message.
alter table community_chat_messages alter column user_id drop not null;
