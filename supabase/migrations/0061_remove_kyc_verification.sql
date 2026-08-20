-- Removes the KYC identity-verification feature added in
-- 0060_kyc_verification.sql. Withdrawals are no longer gated on document
-- verification.

drop policy if exists "kyc-documents: owner read" on storage.objects;
drop policy if exists "kyc-documents: owner write" on storage.objects;
drop policy if exists "kyc-documents: owner delete" on storage.objects;

delete from storage.objects where bucket_id = 'kyc-documents';
delete from storage.buckets where id = 'kyc-documents';

drop index if exists profiles_kyc_status_idx;

alter table profiles drop column if exists kyc_status;
alter table profiles drop column if exists kyc_document_front_path;
alter table profiles drop column if exists kyc_document_back_path;
alter table profiles drop column if exists kyc_submitted_at;
alter table profiles drop column if exists kyc_reviewed_at;
alter table profiles drop column if exists kyc_reviewed_by;
alter table profiles drop column if exists kyc_rejection_reason;

drop type if exists kyc_status;
