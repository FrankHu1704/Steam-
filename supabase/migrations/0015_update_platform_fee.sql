-- Sales fee goes from 5% to 10% (producer keeps 90%).
-- Withdrawal fee stays at 5% (producer keeps 95%) — reaffirmed here for clarity.
insert into settings (key, value) values ('platform_fee_percent', '10')
  on conflict (key) do update set value = excluded.value, updated_at = now();

insert into settings (key, value) values ('withdrawal_fee_percent', '5')
  on conflict (key) do update set value = excluded.value, updated_at = now();
