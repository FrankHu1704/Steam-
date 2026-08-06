-- Community chat is now producer/admin only — buyers no longer read or
-- post (replaces the "any authenticated user" policies from 0039).

drop policy "community_chat: any authenticated user reads" on community_chat_messages;
drop policy "community_chat: user posts own message" on community_chat_messages;

create policy "community_chat: producer/admin reads" on community_chat_messages
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('producer', 'admin'))
  );

create policy "community_chat: producer/admin posts own message" on community_chat_messages
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('producer', 'admin'))
  );
