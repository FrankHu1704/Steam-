-- Optional flat fee (MZN) added on top of platform_fee_percent on every
-- sale — meant to cover the processor's own per-transaction cost (e.g.
-- ZumboPay's "Imposto de Selo", which is a flat amount regardless of the
-- sale price, not a percentage). Defaults to 0 so nothing changes until an
-- admin sets it explicitly in Definições.
insert into settings (key, value) values ('platform_fixed_fee_amount', '0')
  on conflict (key) do nothing;
