import { defineSecret, defineString } from "firebase-functions/params";
import type { PaymentMethod } from "../types";

/**
 * This platform acts as a single aggregator merchant on Debito Pay: one
 * wallet/API key for the whole platform. Individual sellers on this
 * platform are tracked in our own Firestore ledger, not as separate
 * Debito Pay merchants.
 */
export const debitoPayApiKey = defineSecret("DEBITO_PAY_API_KEY");
export const debitoPayWebhookSecret = defineSecret("DEBITO_PAY_WEBHOOK_SECRET");
export const debitoPayMerchantId = defineString("DEBITO_PAY_MERCHANT_ID");
export const debitoPayWalletCode = defineString("DEBITO_PAY_WALLET_CODE");
export const debitoPayBaseUrl = defineString("DEBITO_PAY_BASE_URL", {
  default: "https://gyqoaningqhurhvdugne.supabase.co/functions/v1",
});

interface ProcessPaymentInput {
  paymentMethod: PaymentMethod;
  amount: number;
  currency: "MZN" | "ZAR";
  sourceId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl?: string;
  customerIp?: string;
  customerUserAgent?: string;
  customerOrigin?: string;
}

interface DebitoPayProcessResponse {
  success: boolean;
  payment_id?: string;
  payment_method?: string;
  status?: "success" | "pending" | "failed";
  transactionId?: string;
  reference?: string;
  checkout_url?: string;
  awaiting_confirmation?: boolean;
  error?: string;
}

interface DebitoPayStatusResponse {
  success: boolean;
  payment?: {
    id: string;
    status: "pending" | "success" | "failed" | "expired";
    provider_reference: string | null;
    payment_method: string;
    amount: number;
    currency: string;
  };
  error?: string;
}

function authHeaders(extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${debitoPayApiKey.value()}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/**
 * Calls Debito Pay's payment-orchestrator to create a charge.
 * Requires DEBITO_PAY_API_KEY / DEBITO_PAY_MERCHANT_ID / DEBITO_PAY_WALLET_CODE
 * to be configured with real credentials from a Debito Pay merchant account
 * before this will work against production.
 */
export async function createDebitoPayCharge(
  input: ProcessPaymentInput
): Promise<DebitoPayProcessResponse> {
  const body: Record<string, unknown> = {
    action: "process",
    payment_method: input.paymentMethod,
    merchant_id: debitoPayMerchantId.value(),
    wallet_code: debitoPayWalletCode.value(),
    amount: input.amount,
    currency: input.currency,
    source: "gateway",
    source_id: input.sourceId,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
  };

  if (input.customerPhone) {
    // The docs' "common fields" example uses customer_phone, but the
    // mobile-money-specific examples (M-Pesa/e-Mola/mKesh) use a plain
    // "phone" field and error with "Phone number required" if only
    // customer_phone is sent — send both so it's picked up either way.
    body.customer_phone = input.customerPhone;
    body.phone = input.customerPhone;
  }
  if (input.returnUrl) body.return_url = input.returnUrl;
  if (input.customerIp) body.customer_ip = input.customerIp;
  if (input.customerUserAgent) body.customer_user_agent = input.customerUserAgent;
  if (input.customerOrigin) body.customer_origin_url = input.customerOrigin;

  const headers = authHeaders();
  if (input.customerIp) (headers as Record<string, string>)["X-Customer-IP"] = input.customerIp;
  if (input.customerUserAgent)
    (headers as Record<string, string>)["X-Customer-User-Agent"] = input.customerUserAgent;
  if (input.customerOrigin)
    (headers as Record<string, string>)["X-Customer-Origin"] = input.customerOrigin;

  const res = await fetch(`${debitoPayBaseUrl.value()}/payment-orchestrator`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as DebitoPayProcessResponse;
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Debito Pay error (HTTP ${res.status})`);
  }
  return json;
}

export async function checkDebitoPayStatus(
  paymentId: string
): Promise<DebitoPayStatusResponse> {
  const res = await fetch(`${debitoPayBaseUrl.value()}/payment-orchestrator`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ action: "check-status", payment_id: paymentId }),
  });

  const json = (await res.json()) as DebitoPayStatusResponse;
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Debito Pay error (HTTP ${res.status})`);
  }
  return json;
}

export async function getDebitoPayWalletBalance(): Promise<unknown> {
  const url = new URL(`${debitoPayBaseUrl.value()}/wallet-balance`);
  url.searchParams.set("wallet_code", debitoPayWalletCode.value());
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok || !(json as { success?: boolean }).success) {
    throw new Error(
      (json as { error?: string }).error || `Debito Pay error (HTTP ${res.status})`
    );
  }
  return json;
}

/**
 * Verifies the `x-webhook-signature` header Debito Pay sends against the
 * raw request body, per their documented HMAC-SHA256 scheme.
 */
export function verifyDebitoPaySignature(
  rawBody: Buffer,
  signature: string | undefined
): boolean {
  if (!signature) return false;
  const crypto = require("crypto") as typeof import("crypto");
  const expected = crypto
    .createHmac("sha256", debitoPayWebhookSecret.value())
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
