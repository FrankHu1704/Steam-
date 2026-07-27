-- Allow a product's deliverable to be an external link (e.g. Google Drive,
-- área de membros, grupo do WhatsApp/Telegram) instead of only an uploaded
-- file. Exactly one of storage_path/external_url must be set per row.
alter table product_files
  alter column storage_path drop not null,
  add column if not exists external_url text;

alter table product_files drop constraint if exists product_files_source_check;
alter table product_files
  add constraint product_files_source_check
  check (
    (storage_path is not null and external_url is null)
    or (storage_path is null and external_url is not null)
  ) not valid;
