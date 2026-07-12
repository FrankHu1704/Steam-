insert into settings (key, value) values ('withdrawal_minimum_amount', '150')
on conflict (key) do nothing;
