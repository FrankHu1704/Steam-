-- Revenue split for co-produced products (e.g. "aula em parceria") — only
-- takes effect when ZumboPay is the active payment provider, since it uses
-- ZumboPay's own split-payment endpoint (recipient identified by their own
-- ZumboPay wallet_id, not a PagaJá account).
alter table products add column if not exists co_author_wallet_id text;
alter table products add column if not exists co_author_split_percent numeric(5,2);

-- Snapshotted onto the order at checkout time (not read back from the
-- product later), so crediting stays correct even if the producer changes
-- or removes the co-author config after the sale.
alter table orders add column if not exists co_author_split_percent numeric(5,2);
