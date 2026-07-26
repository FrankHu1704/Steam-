-- Campaign/UTM tracking (own system, no external UTMify account needed)
-- and a free-form tracking-script field so producers can paste their own
-- ad pixels (Meta, Google, TikTok, UTMify, etc.) onto their product page.

alter table orders
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text;

alter table products
  add column if not exists tracking_script text;
