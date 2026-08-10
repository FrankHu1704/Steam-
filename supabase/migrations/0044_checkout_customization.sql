-- Checkout customization for payment links: accent color (a fixed,
-- validated palette — never raw CSS) and a short highlight/urgency phrase
-- shown above the payment button. Title/description reuse the existing
-- columns (LunaAI just helps write them).

alter table products add column if not exists checkout_accent_color text;
alter table products add column if not exists checkout_highlight_text text;
