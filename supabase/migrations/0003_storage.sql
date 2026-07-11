-- Storage buckets: covers are public, product files are private (served
-- only via signed URLs minted server-side after a paid order).

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', false)
on conflict (id) do nothing;

-- covers/{producerId}/... — public read, owner write
create policy "covers: public read" on storage.objects
  for select using (bucket_id = 'covers');
create policy "covers: owner write" on storage.objects
  for insert with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers: owner update" on storage.objects
  for update using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers: owner delete" on storage.objects
  for delete using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars/{userId}/... — public read, owner write
create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars: owner write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: owner update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- product-files/{producerId}/{productId}/... — never public; only the
-- owning producer can read/write via the client, everyone else (buyers)
-- gets access exclusively through signed URLs minted by a server route
-- using the service-role client after checking a paid order exists.
create policy "product-files: owner read" on storage.objects
  for select using (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "product-files: owner write" on storage.objects
  for insert with check (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "product-files: owner delete" on storage.objects
  for delete using (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);
