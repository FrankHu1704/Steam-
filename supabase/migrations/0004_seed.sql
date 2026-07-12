-- ============================================================================
-- SMSMoz — Seed data
-- ============================================================================

insert into public.plans (name, description, price, currency, credits, price_per_sms, features, is_active, is_popular, sort_order)
values
  ('Starter', 'Ideal para começar a enviar SMS', 500, 'MZN', 300, 1.67,
    '["300 créditos SMS","Suporte por email","API REST incluída","Relatórios básicos"]'::jsonb, true, false, 1),
  ('Business', 'Para empresas em crescimento', 2000, 'MZN', 1500, 1.33,
    '["1500 créditos SMS","Suporte prioritário","SMS agendado","Listas de contactos ilimitadas","Relatórios avançados"]'::jsonb, true, true, 2),
  ('Enterprise', 'Volume elevado e integrações dedicadas', 8000, 'MZN', 7000, 1.14,
    '["7000 créditos SMS","Gestor de conta dedicado","SLA garantido","Sender ID personalizado","Webhooks e integrações"]'::jsonb, true, false, 3)
on conflict do nothing;

insert into public.system_settings (key, value)
values
  ('sms_pricing', '{"base_price_per_sms": 1.5, "currency": "MZN", "unicode_multiplier": 2, "long_sms_segment_length": 153}'::jsonb),
  ('platform', '{"name": "SMSMoz", "support_email": "suporte@smsmoz.co.mz", "default_sender_id": "SMSMoz"}'::jsonb),
  ('rate_limits', '{"api_requests_per_minute": 60, "bulk_max_recipients": 50000}'::jsonb)
on conflict (key) do nothing;

-- NOTE: to promote a user to admin after they sign up, run:
--   update public.profiles set role = 'admin', status = 'active' where id = '<user-uuid>';
