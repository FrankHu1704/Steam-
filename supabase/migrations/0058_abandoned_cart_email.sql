-- Abandoned-cart email recovery: separate from the existing WhatsApp nudge
-- (abandoned_notified_at) so both channels can fire independently on their
-- own schedules without racing each other.
alter table orders add column if not exists abandoned_email_sent_at timestamptz;
