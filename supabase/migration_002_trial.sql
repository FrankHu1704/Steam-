-- Senga Host — suporte a plano de teste grátis (48h)
-- Corra no Supabase Dashboard > SQL Editor, depois do migration.sql inicial.

alter table public.profiles
  add column if not exists trial_ends_at timestamptz;
