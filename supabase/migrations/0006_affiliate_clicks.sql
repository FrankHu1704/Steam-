create function increment_affiliate_clicks(affiliate_code text)
returns void as $$
  update affiliates set clicks = clicks + 1 where code = affiliate_code;
$$ language sql security definer;
