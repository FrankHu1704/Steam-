-- Log of automated motivational/reminder push notifications sent to
-- producers (no products yet, no sales, withdrawable balance, first sale,
-- product pending approval — see app/api/cron/producer-nudges). One generic
-- table for every nudge type instead of a column per type on profiles, so
-- new nudge types don't need a schema change. Only server-side code writes
-- here (via the admin client from the cron route), so no RLS policies are
-- needed beyond the default deny.
create table producer_nudges (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references profiles(id) on delete cascade,
  nudge_type text not null,
  sent_at timestamptz not null default now()
);

create index producer_nudges_lookup_idx on producer_nudges (producer_id, nudge_type, sent_at desc);

alter table producer_nudges enable row level security;
