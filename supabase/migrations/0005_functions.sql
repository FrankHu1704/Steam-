-- Atomic counter bump for coupon redemptions (avoids a read-then-write
-- race between two buyers using the same coupon at once).
create function increment_coupon_usage(coupon_id uuid)
returns void as $$
  update coupons set used_count = used_count + 1 where id = coupon_id;
$$ language sql security definer;

create function increment_product_sales(p_id uuid)
returns void as $$
  update products set sales_count = sales_count + 1 where id = p_id;
$$ language sql security definer;

create function increment_product_views(p_id uuid)
returns void as $$
  update products set view_count = view_count + 1 where id = p_id;
$$ language sql security definer;
