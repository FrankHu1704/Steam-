-- Lets an admin suspend/disable a user's account (producer, buyer, or
-- anyone else). A suspended account is blocked from logging in and any
-- existing session is signed out on its next page load (see
-- lib/data/profile.ts / lib/actions/auth.ts) — the account's data, balance
-- and products are left untouched, only access is cut off.
alter table profiles add column if not exists suspended_at timestamptz;
alter table profiles add column if not exists suspension_reason text;
alter table profiles add column if not exists suspended_by uuid references profiles(id) on delete set null;
