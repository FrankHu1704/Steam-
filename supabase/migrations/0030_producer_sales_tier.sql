-- Lifetime confirmed-sales counter kept on the profile itself, so the
-- marketplace can show a public seller badge (Ouro/Diamante) without
-- counting orders on every listing request.
alter table profiles add column if not exists lifetime_sales_count integer not null default 0;

update profiles set lifetime_sales_count = (
  select count(*) from orders where orders.producer_id = profiles.id and orders.status = 'paid'
);
