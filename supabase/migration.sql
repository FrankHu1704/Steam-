-- Senga Host — schema inicial
-- Corra este script no Supabase Dashboard > SQL Editor > New query > Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null unique,
  phone text,
  plan_id text,
  status text not null default 'pendente'
    check (status in ('pendente', 'ativo', 'pausado', 'erro')),
  is_admin boolean not null default false,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.bot_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  size_bytes bigint not null default 0,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null,
  plan_id text not null,
  amount numeric not null,
  currency text not null default 'MZN',
  payment_method text,
  payment_id text unique,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

-- Cria automaticamente um perfil "pendente" para toda conta nova.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.bot_files enable row level security;
alter table public.orders enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

create policy "bot_files: read own" on public.bot_files
  for select using (auth.uid() = customer_id);

create policy "bot_files: insert own" on public.bot_files
  for insert with check (auth.uid() = customer_id);

create policy "bot_files: delete own" on public.bot_files
  for delete using (auth.uid() = customer_id);

create policy "orders: read own" on public.orders
  for select using (auth.uid() = customer_id);

-- Storage: bucket privado para os ficheiros dos bots.
insert into storage.buckets (id, name, public)
values ('bot-files', 'bot-files', false)
on conflict (id) do nothing;

create policy "bot-files: read own folder" on storage.objects
  for select using (
    bucket_id = 'bot-files' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "bot-files: upload own folder" on storage.objects
  for insert with check (
    bucket_id = 'bot-files' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "bot-files: delete own folder" on storage.objects
  for delete using (
    bucket_id = 'bot-files' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Depois de criar a sua própria conta em /painel/login, torne-se admin:
-- update public.profiles set is_admin = true where email = 'o-seu-email@aqui.com';
