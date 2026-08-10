-- "Link de pagamento": a lighter alternative to the full product wizard
-- for producers who don't want a marketplace listing — same products/
-- product_files tables underneath (reuses moderation, checkout, delivery,
-- everything already built), just flagged and always kept off the
-- marketplace.

alter table products add column if not exists is_payment_link boolean not null default false;
