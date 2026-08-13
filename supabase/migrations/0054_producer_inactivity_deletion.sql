-- Automatic account deletion for inactive producers (see
-- app/api/cron/delete-inactive-producers/route.ts):
--   - No product created within 3 days of becoming a producer → deleted.
--   - Zero lifetime sales 14 days after becoming a producer → deleted.
-- Once a producer has ever had one paid sale (lifetime_sales_count > 0)
-- they're permanently exempt from the second rule, even after a later dry
-- spell — this only targets accounts that never sold anything at all.
--
-- became_producer_at is the clock these rules run from (not the original
-- signup date, since someone can sign up as a buyer long before ever
-- becoming a producer) — see becomeProducer() in lib/actions/profile.ts.
alter table profiles add column if not exists became_producer_at timestamptz;

-- Backfill existing producers to "now" rather than leaving it null or
-- using their original created_at — either would make this policy delete
-- long-standing real accounts the moment it ships, which is not the
-- intent. Existing producers instead get a fresh 3/14-day grace period
-- starting from this migration.
update profiles set became_producer_at = now() where role = 'producer' and became_producer_at is null;
