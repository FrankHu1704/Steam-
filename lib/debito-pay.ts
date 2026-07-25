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
