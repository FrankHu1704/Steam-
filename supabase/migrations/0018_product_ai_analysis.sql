-- Cached AI analysis/tips for a product (generated on demand via Groq),
-- shown to the producer on their product edit page.
alter table products
  add column if not exists ai_analysis text,
  add column if not exists ai_analysis_at timestamptz;
