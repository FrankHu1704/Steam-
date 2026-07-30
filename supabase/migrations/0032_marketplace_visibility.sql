-- Lets a producer keep a product approved and sellable via its direct link
-- while opting out of the public marketplace listing (e.g. selling only
-- through their own social media/checkout link).
alter table products add column if not exists show_in_marketplace boolean not null default true;
