-- ============================================================================
-- SMSMoz — Functions & triggers
-- ============================================================================

-- ── updated_at auto-touch ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- ── Auto-create profile when a new auth user signs up ──────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, company_name, phone, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'phone',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Helper: is the current user an admin? (used by RLS policies) ───────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Atomically adjust a user's credit balance, logging a transaction ───────
-- p_amount: positive to add credits, negative to deduct.
create or replace function public.adjust_credits(
  p_user_id uuid,
  p_credits numeric,
  p_type transaction_type,
  p_reference text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_new_balance numeric;
begin
  update public.profiles
    set credits = credits + p_credits
    where id = p_user_id
    returning credits into v_new_balance;

  if v_new_balance is null then
    raise exception 'User % not found', p_user_id;
  end if;

  if v_new_balance < 0 then
    raise exception 'Insufficient credits for user %', p_user_id;
  end if;

  insert into public.transactions (user_id, type, amount, credits, payment_status, reference, metadata, created_by)
  values (p_user_id, p_type, 0, p_credits, 'completed', p_reference, p_metadata, p_created_by);

  return v_new_balance;
end;
$$;

-- ── Deduct credits for an SMS send (raises if insufficient balance) ────────
create or replace function public.charge_sms(
  p_user_id uuid,
  p_cost numeric,
  p_message_id uuid
)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_balance numeric;
begin
  select credits into v_balance from public.profiles where id = p_user_id for update;

  if v_balance is null then
    raise exception 'User % not found', p_user_id;
  end if;

  if v_balance < p_cost then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update public.profiles set credits = credits - p_cost where id = p_user_id;

  insert into public.transactions (user_id, type, amount, credits, payment_status, reference, metadata)
  values (p_user_id, 'usage', 0, -p_cost, 'completed', p_message_id::text, jsonb_build_object('message_id', p_message_id));

  return v_balance - p_cost;
end;
$$;

-- ── Dashboard aggregate stats for a user ────────────────────────────────────
create or replace function public.get_user_stats(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'credits', (select credits from public.profiles where id = p_user_id),
    'sent_today', (select count(*) from public.sms_messages where user_id = p_user_id and created_at >= date_trunc('day', now())),
    'sent_month', (select count(*) from public.sms_messages where user_id = p_user_id and created_at >= date_trunc('month', now())),
    'delivered_total', (select count(*) from public.sms_messages where user_id = p_user_id and status = 'delivered'),
    'failed_total', (select count(*) from public.sms_messages where user_id = p_user_id and status = 'failed'),
    'delivery_rate', (
      select case when count(*) = 0 then 0
        else round(100.0 * count(*) filter (where status = 'delivered') / count(*), 2) end
      from public.sms_messages where user_id = p_user_id and status in ('delivered','failed','sent')
    ),
    'total_spent', (select coalesce(sum(-credits),0) from public.transactions where user_id = p_user_id and type = 'usage')
  );
$$;

-- ── Platform-wide stats for admin dashboard ─────────────────────────────────
create or replace function public.get_admin_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles where role = 'client'),
    'active_users', (select count(*) from public.profiles where role = 'client' and status = 'active'),
    'pending_users', (select count(*) from public.profiles where role = 'client' and status = 'pending'),
    'sms_today', (select count(*) from public.sms_messages where created_at >= date_trunc('day', now())),
    'sms_month', (select count(*) from public.sms_messages where created_at >= date_trunc('month', now())),
    'revenue_month', (
      select coalesce(sum(amount),0) from public.transactions
      where type = 'purchase' and payment_status = 'completed' and created_at >= date_trunc('month', now())
    ),
    'delivery_rate', (
      select case when count(*) = 0 then 0
        else round(100.0 * count(*) filter (where status = 'delivered') / count(*), 2) end
      from public.sms_messages where status in ('delivered','failed','sent')
    )
  );
$$;
