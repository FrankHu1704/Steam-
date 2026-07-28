import crypto from "node:crypto";

// Server-only module — never import from a "use client" file.
// Reused lessons from the earlier PagaJá build: each Debito Pay wallet is
// bound to one payment_method, and mobile-money charges need a plain
// "phone" field (not just customer_phone) or they fail with
// "Phone number required".

export type PaymentMethod = "mpesa" | "emola" | "mkesh" | "visa_mastercard" | "payfast";

function walletCodeForMethod(method: PaymentMethod): string {
  const byMethod: Record<PaymentMethod, string | undefined> = {
    mpesa: process.env.DEBITO_PAY_WALLET_CODE_MPESA,
    emola: process.env.DEBITO_PAY_WALLET_CODE_EMOLA,
    mkesh: process.env.DEBITO_PAY_WALLET_CODE_MKESH,
    visa_mastercard: process.env.DEBITO_PAY_WALLET_CODE_VISA_MASTERCARD,
    payfast: process.env.DEBITO_PAY_WALLET_CODE_PAYFAST,
  };
  const code = byMethod[method];
  if (!code) {
    throw new Error(
      `Nenhum wallet_code configurado para "${method}". Defina DEBITO_PAY_WALLET_CODE_${method.toUpperCase()}.`
    );
  }
  return code;
}

function baseUrl() {
  return process.env.DEBITO_PAY_BASE_URL || "https://gyqoaningqhurhvdugne.supabase.co/functions/v1";
}

interface ChargeInput {
  paymentMethod: PaymentMethod;
  amount: number;
  currency: "MZN" | "ZAR";
  sourceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl?: string;
}

interface ChargeResult {
  success: boolean;
  payment_id?: string;
  status?: "success" | "pending" | "failed";
  reference?: string;
  checkout_url?: string;
  error?: string;
}

export async function createCharge(input: ChargeInput): Promise<ChargeResult> {
  const body: Record<string, unknown> = {
    action: "process",
    payment_method: input.paymentMethod,
    merchant_id: process.env.DEBITO_PAY_MERCHANT_ID,
    wallet_code: walletCodeForMethod(input.paymentMethod),
    amount: input.amount,
    currency: input.currency,
    source: "gateway",
    source_id: input.sourceId,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
  };
  if (input.customerPhone) {
    body.customer_phone = input.customerPhone;
    body.phone = input.customerPhone; // see module comment
  }
  if (input.returnUrl) body.return_url = input.returnUrl;

  const res = await fetch(`${baseUrl()}/payment-orchestrator`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEBITO_PAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as ChargeResult;
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Debito Pay error (HTTP ${res.status})`);
  }
  return json;
}

export async function checkChargeStatus(paymentId: string) {
  const res = await fetch(`${baseUrl()}/payment-orchestrator`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEBITO_PAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "check-status", payment_id: paymentId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Debito Pay error (HTTP ${res.status})`);
  }
  return json.payment as { status: "pending" | "success" | "failed" | "expired" };
}

interface PayoutInput {
  method: "mpesa" | "emola";
  amount: number;
  destination: string;
  notes?: string;
  /** No-op here — Debito Pay's M-Pesa B2C payout is always synchronous. */
  autoDispatch?: boolean;
}

interface PayoutResult {
  success: boolean;
  status?: "pending" | "success" | "failed";
  reference?: string;
  providerReference?: string;
  feeAmount?: number;
  netAmount?: number;
  error?: string;
}

function mozPhoneWithCountryCode(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `258${digits.slice(-9)}`;
}

/** Sends money OUT from PagaJá's Debito Pay M-Pesa wallet to a producer's
 * phone — per their docs, payouts only support M-Pesa, debit the wallet's
 * matured (D+1) balance, and are reverted automatically by Debito Pay if
 * the provider (Vodacom) rejects the request. */
export async function createPayout(input: PayoutInput): Promise<PayoutResult> {
  if (input.method !== "mpesa") {
    return { success: false, error: "Debito Pay só suporta B2C para M-Pesa." };
  }

  const reference = `PAYOUT-${Date.now()}`;
  const res = await fetch(`${baseUrl()}/payment-orchestrator?action=payout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEBITO_PAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payment_method: "mpesa",
      wallet_code: walletCodeForMethod("mpesa"),
      amount: input.amount,
      phone: mozPhoneWithCountryCode(input.destination),
      reference,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    return { success: false, error: json?.error || `Debito Pay error (HTTP ${res.status})` };
  }

  return {
    success: true,
    status: "success",
    reference: json.reference ?? reference,
    providerReference: json.providerReference ?? json.transactionReference,
  };
}

export interface WalletBalance {
  method: "mpesa" | "emola";
  walletId: string;
  balance: number | null;
  currency: string | null;
}

/** GET /wallet-balance — returns every wallet belonging to the merchant
 * behind the configured API key; filtered down to the two methods PagaJá
 * cares about. */
export async function getWalletBalances(): Promise<WalletBalance[]> {
  const res = await fetch(`${baseUrl()}/wallet-balance`, {
    headers: { Authorization: `Bearer ${process.env.DEBITO_PAY_API_KEY}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return [];

  const wallets = (json.wallets ?? []) as Record<string, unknown>[];
  return wallets
    .filter((w) => w.payment_method === "mpesa" || w.payment_method === "emola")
    .map((w) => ({
      method: w.payment_method as "mpesa" | "emola",
      walletId: String(w.wallet_id ?? w.wallet_code ?? ""),
      balance: typeof w.balance === "number" ? w.balance : null,
      currency: typeof w.currency === "string" ? w.currency : null,
    }));
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined | null): boolean {
  if (!signature) return false;
  const secret = process.env.DEBITO_PAY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const cleanSignature = signature.trim().replace(/^sha256=/, "");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanSignature));
  } catch {
    return false;
  }
}
