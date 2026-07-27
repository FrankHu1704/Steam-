-- Structured, individually-optional pixel fields (Facebook, TikTok, Google
-- Analytics) alongside the existing free-form tracking_script — matches the
-- "one field per platform, none required" UX producers expect, while the
-- free-form field stays available for anything else (UTMify, custom scripts).
alter table products
  add column if not exists facebook_pixel_id text,
  add column if not exists tiktok_pixel_id text,
  add column if not exists google_analytics_id text;
