export type PaymentMethod =
  | "mpesa"
  | "emola"
  | "mkesh"
  | "visa_mastercard"
  | "payfast";

export type PaymentStatus = "pending" | "success" | "failed" | "expired";

export interface PaymentDoc {
  merchantId: string;
  productId: string | null;
  amount: number;
  currency: "MZN" | "ZAR";
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  debitoPayPaymentId: string | null;
  reference: string | null;
  checkoutUrl: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sourceId: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  completedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
}

export type ProductStatus = "pending" | "approved" | "rejected";

export interface ProductDoc {
  merchantId: string;
  name: string;
  description: string;
  price: number;
  currency: "MZN" | "ZAR";
  imageUrl: string | null;
  status: ProductStatus;
  rejectionReason: string | null;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  reviewedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
  reviewedBy: string | null;
}

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

export interface WithdrawalDoc {
  merchantId: string;
  amount: number;
  currency: "MZN" | "ZAR";
  payoutMethod: PaymentMethod | "bank_transfer";
  destination: string;
  status: WithdrawalStatus;
  rejectionReason: string | null;
  payoutReference: string | null;
  requestedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  reviewedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
  reviewedBy: string | null;
  paidAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | null;
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
