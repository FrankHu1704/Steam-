// Hand-written mirror of supabase/migrations/*.sql. If you have the
// Supabase CLI available, prefer regenerating with:
//   supabase gen types typescript --project-id <ref> > types/database.ts

export type UserRole = "buyer" | "producer" | "admin";
export type ProductStatus = "draft" | "pending" | "approved" | "rejected" | "paused";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "expired";
export type PayoutMethod = "mpesa" | "emola" | "mkesh" | "bank_transfer";
export type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid" | "confirmed";
export type CouponDiscountType = "percent" | "fixed";
export type CommissionStatus = "pending" | "paid";

export type ApiKeyMode = "test" | "live";

export interface ApiKey {
  id: string;
  producer_id: string;
  label: string;
  client_id: string;
  client_secret_hash: string;
  mode: ApiKeyMode;
  revoked_at: string | null;
  created_at: string;
}

export type ProductionUnlockStatus = "pending" | "paid" | "failed";

export interface ProductionUnlock {
  id: string;
  producer_id: string;
  amount: number;
  currency: string;
  provider: string;
  provider_payment_id: string | null;
  status: ProductionUnlockStatus;
  created_at: string;
  paid_at: string | null;
}

export interface ApiAccessToken {
  id: string;
  api_key_id: string;
  producer_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface DeveloperWebhook {
  id: string;
  producer_id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  role: UserRole;
  email: string;
  email_verified: boolean;
  balance_available: number;
  balance_pending: number;
  currency: string;
  production_unlocked_at: string | null;
  production_access_expires_at: string | null;
  recruited_by_employee_id: string | null;
  recruited_by_producer_id: string | null;
  lifetime_sales_count: number;
  lifetime_revenue: number;
  balance_available_dev: number;
  is_cto: boolean;
  balance_available_cto: number;
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  suspended_by: string | null;
}

export interface CtoMonthlyCredit {
  id: string;
  cto_id: string;
  amount: number;
  net_profit: number;
  period_month: string;
  created_at: string;
}

export interface CommunityChatMessage {
  id: string;
  // null only for LunaAI's own messages (user_role "bot") — she has no
  // real profiles row behind her.
  user_id: string | null;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

export interface ProducerPrizeDelivery {
  id: string;
  producer_id: string;
  tier_key: string;
  delivered_at: string;
  delivered_by: string | null;
  notes: string | null;
}

export interface ProducerAffiliateCommission {
  id: string;
  producer_id: string;
  affiliate_id: string;
  order_id: string;
  amount: number;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  bi_number: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  mpesa_number: string | null;
  emola_number: string | null;
  referral_code: string;
  commission_percent: number;
  active: boolean;
  balance_available: number;
  created_by: string | null;
  created_at: string;
}

export interface EmployeeLinkClick {
  id: string;
  employee_id: string;
  created_at: string;
}

export interface EmployeeCommission {
  id: string;
  employee_id: string;
  order_id: string;
  producer_id: string;
  amount: number;
  created_at: string;
}

export interface EmployeePayout {
  id: string;
  employee_id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  payout_reference: string | null;
  failure_reason: string | null;
  period_month: string;
  created_at: string;
  paid_at: string | null;
  provider_fee_amount: number;
}

export interface EmployeeApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  bi_number: string;
  address: string;
  city: string;
  province: string;
  mpesa_number: string | null;
  emola_number: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_employee_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  producer_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string;
  cover_image_url: string | null;
  video_url: string | null;
  price: number;
  promo_price: number | null;
  currency: string;
  affiliate_enabled: boolean;
  affiliate_commission_percent: number;
  bump_enabled: boolean;
  show_in_marketplace: boolean;
  is_payment_link: boolean;
  checkout_accent_color: string | null;
  checkout_highlight_text: string | null;
  checkout_banner_url: string | null;
  price_usd: number | null;
  status: ProductStatus;
  rejection_reason: string | null;
  seo_title: string | null;
  seo_description: string | null;
  view_count: number;
  sales_count: number;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  tracking_script: string | null;
  facebook_pixel_id: string | null;
  tiktok_pixel_id: string | null;
  google_analytics_id: string | null;
  ai_analysis: string | null;
  ai_analysis_at: string | null;
}

export interface ProductFile {
  id: string;
  product_id: string;
  name: string;
  storage_path: string | null;
  external_url: string | null;
  size_bytes: number;
  sort_order: number;
  created_at: string;
}

export interface Coupon {
  id: string;
  producer_id: string;
  product_id: string | null;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  product_id: string | null;
  producer_id: string;
  buyer_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  amount: number;
  discount_amount: number;
  coupon_id: string | null;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  payment_method: string | null;
  affiliate_id: string | null;
  affiliate_commission_amount: number;
  created_at: string;
  paid_at: string | null;
  credited_at: string | null;
  platform_fee_amount: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  upsell_of_order_id: string | null;
  abandoned_notified_at: string | null;
  source: "marketplace" | "api";
  // Only set for "manual" API charges (no product_id) — what the charge
  // was for, shown in place of a product title in emails/notifications.
  description: string | null;
  // Captured at checkout time for the Facebook Conversions API's Purchase
  // event (lib/facebook-capi.ts) — never required, always best-effort.
  client_ip: string | null;
  client_user_agent: string | null;
  fbp: string | null;
  fbc: string | null;
  // The processor's own commission for this sale (NetShop-confirmed only
  // so far) — a real cost, separate from our own platform_fee_amount.
  processor_fee_amount: number | null;
}

export interface WebhookDelivery {
  id: string;
  producer_id: string;
  order_id: string;
  event: string;
  payload: Record<string, unknown>;
  attempt_count: number;
  status: "pending" | "delivered" | "failed";
  last_error: string | null;
  next_attempt_at: string;
  created_at: string;
  delivered_at: string | null;
}

export interface OrderBump {
  id: string;
  order_id: string;
  bump_product_id: string;
  price: number;
  created_at: string;
}

export interface ProductBumpOffer {
  id: string;
  product_id: string;
  bump_product_id: string;
  sort_order: number;
  created_at: string;
}

export interface ProductUpsell {
  id: string;
  product_id: string;
  upsell_product_id: string;
  custom_price: number | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string | null;
  reference: string | null;
  checkout_url: string | null;
  status: OrderStatus;
  raw_response: unknown;
  created_at: string;
  updated_at: string;
}

export interface Download {
  id: string;
  order_id: string;
  product_file_id: string;
  download_token: string;
  expires_at: string;
  downloaded_at: string | null;
  created_at: string;
}

export interface Affiliate {
  id: string;
  product_id: string;
  affiliate_id: string;
  code: string;
  commission_percent: number;
  clicks: number;
  sales: number;
  commission_earned: number;
  created_at: string;
}

export interface Commission {
  id: string;
  affiliate_row_id: string;
  order_id: string;
  amount: number;
  status: CommissionStatus;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  producer_id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  currency: string;
  payout_method: PayoutMethod;
  destination: string;
  wallet_source: "producer" | "dev" | "cto";
  status: WithdrawalStatus;
  rejection_reason: string | null;
  payout_reference: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  provider_fee_amount: number;
}

export interface PayoutWallet {
  id: string;
  producer_id: string;
  method: "mpesa" | "emola";
  holder_name: string;
  phone: string;
  is_default: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface LunaMessage {
  id: string;
  producer_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface LogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: unknown;
  created_at: string;
}

export interface CourseModule {
  id: string;
  product_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_url: string | null;
  is_external_link: boolean;
  sort_order: number;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  lesson_id: string;
  buyer_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

export interface ApiCallLog {
  id: string;
  producer_id: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> };

export interface Database {
  public: {
    Tables: {
      profiles: Row<Profile>;
      categories: Row<Category>;
      products: Row<Product>;
      product_files: Row<ProductFile>;
      coupons: Row<Coupon>;
      orders: Row<Order>;
      order_bumps: Row<OrderBump>;
      product_bump_offers: Row<ProductBumpOffer>;
      product_upsells: Row<ProductUpsell>;
      payments: Row<Payment>;
      downloads: Row<Download>;
      affiliates: Row<Affiliate>;
      commissions: Row<Commission>;
      withdrawals: Row<Withdrawal>;
      reviews: Row<Review>;
      notifications: Row<Notification>;
      settings: Row<Setting>;
      logs: Row<LogEntry>;
      course_modules: Row<CourseModule>;
      course_lessons: Row<CourseLesson>;
      lesson_progress: Row<LessonProgress>;
      lesson_comments: Row<LessonComment>;
      api_keys: Row<ApiKey>;
      api_access_tokens: Row<ApiAccessToken>;
      developer_webhooks: Row<DeveloperWebhook>;
      production_unlocks: Row<ProductionUnlock>;
      api_call_logs: Row<ApiCallLog>;
      push_subscriptions: Row<PushSubscriptionRow>;
      employees: Row<Employee>;
      employee_link_clicks: Row<EmployeeLinkClick>;
      employee_commissions: Row<EmployeeCommission>;
      employee_payouts: Row<EmployeePayout>;
      employee_applications: Row<EmployeeApplication>;
      producer_affiliate_commissions: Row<ProducerAffiliateCommission>;
      webhook_deliveries: Row<WebhookDelivery>;
      producer_prize_deliveries: Row<ProducerPrizeDelivery>;
      community_chat_messages: Row<CommunityChatMessage>;
      cto_monthly_credits: Row<CtoMonthlyCredit>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      product_status: ProductStatus;
      order_status: OrderStatus;
      payout_method: PayoutMethod;
      withdrawal_status: WithdrawalStatus;
      coupon_discount_type: CouponDiscountType;
      commission_status: CommissionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
