-- Producer-customizable checkout page content blocks (benefits,
-- testimonials, guarantee, countdown, FAQ) — see lib/checkout-blocks.ts.
-- Always structured JSON, never raw HTML, rendered through fixed React
-- components on /p/[slug] — no injection risk on a real payment page.
alter table products add column if not exists checkout_blocks jsonb not null default '[]'::jsonb;
