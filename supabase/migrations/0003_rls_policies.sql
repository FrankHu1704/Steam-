-- ============================================================================
-- SMSMoz — Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.promotions enable row level security;
alter table public.api_keys enable row level security;
alter table public.contact_lists enable row level security;
alter table public.contacts enable row level security;
alter table public.sms_batches enable row level security;
alter table public.sms_messages enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.is_admin());

-- ── plans (public catalogue, admin-managed) ─────────────────────────────
create policy "plans_select_all" on public.plans
  for select using (true);
create policy "plans_write_admin" on public.plans
  for all using (public.is_admin()) with check (public.is_admin());

-- ── promotions ───────────────────────────────────────────────────────────
create policy "promotions_select_active_or_admin" on public.promotions
  for select using (is_active or public.is_admin());
create policy "promotions_write_admin" on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

-- ── api_keys ─────────────────────────────────────────────────────────────
create policy "api_keys_owner" on public.api_keys
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ── contact_lists ────────────────────────────────────────────────────────
create policy "contact_lists_owner" on public.contact_lists
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ── contacts ─────────────────────────────────────────────────────────────
create policy "contacts_owner" on public.contacts
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ── sms_batches ──────────────────────────────────────────────────────────
create policy "sms_batches_owner" on public.sms_batches
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ── sms_messages ─────────────────────────────────────────────────────────
create policy "sms_messages_owner_select" on public.sms_messages
  for select using (user_id = auth.uid() or public.is_admin());
create policy "sms_messages_owner_insert" on public.sms_messages
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "sms_messages_admin_update" on public.sms_messages
  for update using (public.is_admin());

-- ── transactions ─────────────────────────────────────────────────────────
create policy "transactions_owner_select" on public.transactions
  for select using (user_id = auth.uid() or public.is_admin());
create policy "transactions_admin_write" on public.transactions
  for insert with check (public.is_admin() or user_id = auth.uid());
create policy "transactions_admin_update" on public.transactions
  for update using (public.is_admin());

-- ── notifications ────────────────────────────────────────────────────────
create policy "notifications_owner" on public.notifications
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ── audit_logs (admin only) ──────────────────────────────────────────────
create policy "audit_logs_admin_select" on public.audit_logs
  for select using (public.is_admin());
create policy "audit_logs_insert_any_authenticated" on public.audit_logs
  for insert with check (auth.uid() is not null);

-- ── system_settings ──────────────────────────────────────────────────────
create policy "system_settings_select_all_authenticated" on public.system_settings
  for select using (auth.uid() is not null);
create policy "system_settings_write_admin" on public.system_settings
  for all using (public.is_admin()) with check (public.is_admin());
