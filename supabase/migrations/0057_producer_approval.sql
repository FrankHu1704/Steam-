-- Requires admin approval before a buyer account can start selling
-- (anti-fraud measure) — see app/dashboard/layout.tsx and
-- approveProducerAccount()/rejectProducerAccount() in lib/actions/admin.ts.
-- profiles.role only ever flips to 'producer' on approval; a pending or
-- rejected request keeps role='buyer' the whole time.
alter table profiles add column if not exists producer_status text;
alter table profiles add column if not exists producer_rejection_reason text;
