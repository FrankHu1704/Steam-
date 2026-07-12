export type UserRole = 'client' | 'admin'
export type AccountStatus = 'pending' | 'active' | 'blocked'
export type SmsStatus = 'queued' | 'scheduled' | 'sent' | 'delivered' | 'failed' | 'rejected'
export type SmsType = 'single' | 'bulk' | 'transactional' | 'api'
export type TransactionType = 'purchase' | 'usage' | 'refund' | 'bonus' | 'admin_adjustment'
export type PaymentMethod = 'mpesa' | 'emola' | 'card' | 'paypal' | 'stripe' | 'manual'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export type Profile = {
  id: string
  full_name: string
  company_name: string | null
  phone: string | null
  role: UserRole
  status: AccountStatus
  credits: number
  plan_id: string | null
  avatar_url: string | null
  two_fa_enabled: boolean
  default_sender_id: string
  created_at: string
  updated_at: string
}

export type Plan = {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  credits: number
  price_per_sms: number
  features: string[]
  is_active: boolean
  is_popular: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type Promotion = {
  id: string
  code: string
  description: string | null
  discount_percent: number
  bonus_credits: number
  valid_from: string
  valid_until: string | null
  max_uses: number | null
  used_count: number
  is_active: boolean
  created_at: string
}

export type ApiKey = {
  id: string
  user_id: string
  name: string
  key_prefix: string
  key_hash: string
  last_used_at: string | null
  is_active: boolean
  revoked_at: string | null
  created_at: string
}

export type ContactList = {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export type Contact = {
  id: string
  user_id: string
  list_id: string | null
  name: string | null
  phone: string
  tags: string[]
  custom_fields: Record<string, unknown>
  created_at: string
}

export type SmsBatch = {
  id: string
  user_id: string
  name: string
  total_recipients: number
  total_cost: number
  status: SmsStatus
  scheduled_at: string | null
  created_at: string
}

export type SmsMessage = {
  id: string
  user_id: string
  api_key_id: string | null
  batch_id: string | null
  recipient: string
  sender_id: string
  message: string
  message_type: SmsType
  status: SmsStatus
  segments: number
  is_unicode: boolean
  is_flash: boolean
  cost: number
  scheduled_at: string | null
  sent_at: string | null
  delivered_at: string | null
  external_id: string | null
  error_message: string | null
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  credits: number
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  reference: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export type AuditLog = {
  id: string
  actor_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export type UserStats = {
  credits: number
  sent_today: number
  sent_month: number
  delivered_total: number
  failed_total: number
  delivery_rate: number
  total_spent: number
}

export type AdminStats = {
  total_users: number
  active_users: number
  pending_users: number
  sms_today: number
  sms_month: number
  revenue_month: number
  delivery_rate: number
}

// Minimal Supabase Database type used for typing the client.
// Extend with `supabase gen types typescript` for full generated types.
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>
      plans: Table<Plan>
      promotions: Table<Promotion>
      api_keys: Table<ApiKey>
      contact_lists: Table<ContactList>
      contacts: Table<Contact>
      sms_batches: Table<SmsBatch>
      sms_messages: Table<SmsMessage>
      transactions: Table<Transaction>
      notifications: Table<Notification>
      audit_logs: Table<AuditLog>
      system_settings: Table<
        { key: string; value: unknown; updated_at: string; updated_by: string | null },
        { key: string; value: unknown; updated_at?: string; updated_by?: string | null },
        { key?: string; value?: unknown; updated_at?: string; updated_by?: string | null }
      >
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      adjust_credits: {
        Args: {
          p_user_id: string
          p_credits: number
          p_type: TransactionType
          p_reference?: string | null
          p_metadata?: Record<string, unknown>
          p_created_by?: string | null
        }
        Returns: number
      }
      charge_sms: { Args: { p_user_id: string; p_cost: number; p_message_id: string }; Returns: number }
      get_user_stats: { Args: { p_user_id: string }; Returns: UserStats }
      get_admin_stats: { Args: Record<string, never>; Returns: AdminStats }
    }
  }
}
