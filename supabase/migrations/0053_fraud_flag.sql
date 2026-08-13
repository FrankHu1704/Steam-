-- Marks an account as fraud/scam (stronger than a plain suspension): the
-- admin action that sets this also zeroes the account's balance columns as
-- a permanent forfeiture (see markUserAsFraud() in lib/actions/admin.ts).
-- fraud_flag stays true forever as a historical record even after the
-- account is later reactivated (suspended_at cleared) — only the login
-- block is reversible, the forfeited balance never is.
alter table profiles add column if not exists fraud_flag boolean not null default false;
