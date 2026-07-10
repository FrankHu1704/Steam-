export type PaymentMethod =
  | "mpesa"
  | "emola"
  | "mkesh"
  | "visa_mastercard"
  | "payfast";

export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "expired"
  | "refunded"
  | "chargeback";

export interface PaymentDoc {
  merchantId: string;
  productId: string | null;
  amount: number;
  currency: "MZN" | "ZAR";
  paymentMethod: PaymentMethod | null;
  status: PaymentStatus | "awaiting_customer";
  debitoPayPaymentId: string | null;
  reference: string | null;
  checkoutUrl: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  sourceId: string;
  /** uid of the affiliate credited for this sale, if any (references an
   * affiliateLinks doc for the same productId). */
  affiliateUid: string | null;
  /** Commission amount owed to that affiliate, computed at purchase time
   * from the product's commission % so later changes don't retroactively
   * change past sales. */
  affiliateCommissionAmount: number;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  completedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
  /** Guards the one-time ledger credit + sales counters so a duplicated
   * webhook delivery can't double-pay anyone. */
  creditedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
}

export type ProductStatus = "pending" | "approved" | "rejected";

export type ProductType = "ebook" | "template" | "grupo_privado" | "videoaula";

export interface ProductFile {
  name: string;
  /** Storage path, not a public URL — files are only ever handed out as
   * short-lived signed URLs after a confirmed purchase. */
  path: string;
  sizeBytes: number;
}

export interface ProductDoc {
  merchantId: string;
  type: ProductType;
  name: string;
  description: string;
  price: number;
  currency: "MZN" | "ZAR";
  coverImageUrl: string | null;
  previewImageUrls: string[];
  files: ProductFile[];
  affiliateEnabled: boolean;
  affiliateCommissionPercent: number;
  active: boolean;
  viewCount: number;
  salesCount: number;
  status: ProductStatus;
  rejectionReason: string | null;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  reviewedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
  reviewedBy: string | null;
}

/** One row per (productId, affiliateUid) pair — created when a merchant
 * opts in to promote another merchant's product. */
export interface AffiliateLinkDoc {
  productId: string;
  merchantId: string; // product owner
  affiliateUid: string; // the promoting merchant
  commissionPercent: number; // snapshot at signup time
  clicks: number;
  sales: number;
  commissionEarned: number;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "confirmed";

export interface WithdrawalDoc {
  merchantId: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  currency: "MZN" | "ZAR";
  payoutMethod: import("./lib/fees").WithdrawalMethod;
  destination: string;
  status: WithdrawalStatus;
  rejectionReason: string | null;
  payoutReference: string | null;
  requestedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  reviewedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
  reviewedBy: string | null;
  paidAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
  confirmedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
}

export type MerchantStatus = "pending" | "active" | "suspended";

export interface MerchantDoc {
  uid: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  status: MerchantStatus;
  balanceAvailable: number;
  balancePending: number;
  currency: "MZN" | "ZAR";
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export type UserRole = "merchant" | "admin";

export interface UserDoc {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

/** Standalone donations (e.g. the Frank AI Solutions "doar" page) — not
 * tied to a merchant/product, money lands in the platform's own Debito
 * Pay wallet. Kept separate from `payments` so the webhook never has to
 * touch a merchant ledger for these. */
export interface DonationDoc {
  donorName: string;
  donorEmail: string;
  donorPhone: string | null;
  message: string | null;
  amount: number;
  currency: "MZN" | "ZAR";
  paymentMethod: PaymentMethod | null;
  status: PaymentStatus;
  debitoPayPaymentId: string | null;
  reference: string | null;
  checkoutUrl: string | null;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  completedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
}
