-- KYC identity verification, required before any producer (new or
-- existing) can request a withdrawal. Separate from producer_status
-- (0057_producer_approval.sql), which only gates whether a buyer account
-- can start selling at all — this gates payouts specifically, and applies
-- to producers who were already approved before this feature existed too.
create type kyc_status as enum ('not_submitted', 'pending', 'approved', 'rejected');

alter table profiles add column if not exists kyc_status kyc_status not null default 'not_submitted';
alter table profiles add column if not exists kyc_document_front_path text;
alter table profiles add column if not exists kyc_document_back_path text;
alter table profiles add column if not exists kyc_submitted_at timestamptz;
alter table profiles add column if not exists kyc_reviewed_at timestamptz;
alter table profiles add column if not exists kyc_reviewed_by uuid references profiles(id);
alter table profiles add column if not exists kyc_rejection_reason text;

create index if not exists profiles_kyc_status_idx on profiles (kyc_status);

-- Private bucket — same pattern as product-files (0003_storage.sql): only
-- the owning user can read/write their own prefix via the client; the
-- admin review UI reads through signed URLs minted server-side with the
-- service-role client, never through this policy.
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

create policy "kyc-documents: owner read" on storage.objects
  for select using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kyc-documents: owner write" on storage.objects
  for insert with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kyc-documents: owner delete" on storage.objects
  for delete using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);
