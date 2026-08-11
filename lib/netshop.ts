import crypto from "node:crypto";
import type { PaymentMethod } from "@/lib/debito-pay";

// Server-only module — third payment processor alongside Debito Pay and
// ZumboPay, selectable via settings.payment_provider. Mirrors the NetShop
// Gateway API (https://www.netshop.co.mz/api/v1):
//   - Auth: Authorization: Bearer <api key> + X-Wallet-ID: <6-digit wallet id>.
//     The merchant's dashboard (Negócio → Carteiras) shows this isn't one
//     blanket ID — NetShop creates a SEPARATE wallet per payment method
//     (each with its own 6-digit id), same model as ZumboPay. Every request
//     must send the wallet id matching the method actually being charged.
//   - Charges: POST /charges (mpesa/emola/mkesh confirm in real time; card
//     returns a hosted_url the customer must be redirected to).
//   - GET /charges/{id} (id or reference) is the authoritative source of
//     truth — NetShop itself reconciles anything stuck "pending" >5min. It
//     must be called with the SAME wallet id the charge was created under,
//     or NetShop returns 404 charge_not_found.
//   - Payouts: POST /payouts supports BOTH mpesa and emola B2C (unlike
//     Debito Pay/ZumboPay, which only automate M-Pesa) — no minimum.
//   - Webhook signature: hex(hmac_sha256(rawBody, secret)) — no timestamp
//     component, unlike ZumboPay's scheme.

function baseUrl() {
  return process.env.NETSHOP_API_URL || "https://www.netshop.co.mz/api/v1";
}

function walletIdForMethod(method: PaymentMethod | "mpesa" | "emola"): string {
  const byMethod: Partial<Record<string, string | undefined>> = {
    mpesa: process.env.NETSHOP_WALLET_MPESA,
    emola: process.env.NETSHOP_WALLET_EMOLA,
    mkesh: process.env.NETSHOP_WALLET_MKESH,
    visa_mastercard: process.env.NETSHOP_WALLET_CARD,
  };
  const id = byMethod[method];
  if (!id) throw new Error(`Nenhuma carteira NetShop configurada para "${method}".`);
  return id;
}

async function request(method: string, path: string, walletId: string, body?: unknown) {
  const apiKey = process.env.NETSHOP_API_KEY?.trim();
  if (!apiKey || !walletId) throw new Error("Processador de pagamento não configurado.");

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Wallet-ID": walletId,
      ...(method === "POST" ? { "Idempotency-Key": crypto.randomUUID() } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json: json ?? {} };
}

function toMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `+258${digits.slice(-9)}`;
}

function mapStatus(raw: string): "success" | "pending" | "failed" {
  const s = raw.toLowerCase();
  if (s === "paid" || s === "completed") return "success";
  if (s === "failed") return "failed";
  return "pending";
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
  title?: string;
}

interface ChargeResult {
  success: boolean;
  payment_id?: string;
  status?: "success" | "pending" | "failed";
  reference?: string;
  checkout_url?: string;
  error?: string;
  // NetShop's full, unmapped response — stored as-is in payments.raw_response
  // (see lib/actions/checkout.ts) so a stuck/failed mobile-money charge can
  // be diagnosed from Admin -> Pedidos without needing new logging for it.
  raw?: unknown;
}

export async function createCharge(input: ChargeInput): Promise<ChargeResult> {
  // NetShop only has a "card" method — both Visa/Mastercard and the (as-yet
  // unused here) payfast concept map to it; mobile money methods pass
  // straight through as their own name.
  const method = input.paymentMethod === "visa_mastercard" ? "card" : input.paymentMethod;

  const body: Record<string, unknown> = {
    amount: input.amount,
    currency: input.currency,
    method,
    reference: input.sourceId,
    metadata: { order_id: input.sourceId },
  };
  if (method === "card") {
    body.customer_email = input.customerEmail;
  } else {
    if (!input.customerPhone) throw new Error("Número de telemóvel é obrigatório para M-Pesa/e-Mola/mKesh.");
    body.msisdn = toMsisdn(input.customerPhone);
  }

  const { status, json } = await request("POST", "/charges", walletIdForMethod(input.paymentMethod), body);
  if (!json?.id) {
    throw new Error(json?.error?.message || json?.error || `Falha no pagamento (HTTP ${status})`);
  }

  if (method === "card") {
    const checkoutUrl = json.checkout?.hosted_url;
    if (!checkoutUrl) throw new Error("Falha ao gerar checkout de cartão.");
    return { success: true, payment_id: json.id, reference: json.id, status: "pending", checkout_url: checkoutUrl, raw: json };
  }

  return {
    success: true,
    payment_id: json.id,
    reference: json.id,
    status: mapStatus(String(json.status ?? "pending")),
    raw: json,
  };
}

/** GET /charges/{id} (accepts our id OR reference) — NetShop's own docs call
 * this "the source of truth"; anything stuck pending >5min is reconciled
 * with the provider before this responds. Must be called with the wallet id
 * matching the ORIGINAL charge's method, or NetShop returns 404. */
export async function getAuthoritativeStatus(
  chargeIdOrReference: string,
  paymentMethod?: PaymentMethod
): Promise<{ status: "success" | "pending" | "failed"; amount?: number; currency?: string }> {
  const { json } = await request(
    "GET",
    `/charges/${encodeURIComponent(chargeIdOrReference)}`,
    walletIdForMethod(paymentMethod ?? "mpesa")
  );
  return {
    status: mapStatus(String(json?.status ?? "pending")),
    amount: typeof json?.amount === "number" ? json.amount : undefined,
    currency: typeof json?.currency === "string" ? json.currency : undefined,
  };
}

export async function checkChargeStatus(paymentId: string, paymentMethod?: PaymentMethod) {
  const result = await getAuthoritativeStatus(paymentId, paymentMethod);
  return { status: result.status };
}

interface PayoutInput {
  method: "mpesa" | "emola";
  amount: number;
  destination: string;
  notes?: string;
  autoDispatch?: boolean;
  recipientName?: string;
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

/** Sends money OUT from PagaJá's NetShop wallet to a producer's phone — per
 * NetShop's docs this is the only one of our three processors whose B2C
 * supports both M-Pesa AND e-Mola, with no minimum amount. Debits only the
 * wallet's settled balance; over-the-balance requests are rejected with
 * 422 insufficient_balance. */
export async function createPayout(input: PayoutInput): Promise<PayoutResult> {
  const reference = `PAYOUT-${Date.now()}`;
  const { status, json } = await request(
    "POST",
    "/payouts",
    walletIdForMethod(input.method),
    {
      amount: input.amount,
      currency: "MZN",
      method: input.method,
      msisdn: toMsisdn(input.destination),
      reference,
      ...(input.notes ? { metadata: { notes: input.notes } } : {}),
    }
  );

  if (!json?.id) {
    return { success: false, error: json?.error?.message || json?.error || `Falha no pagamento (HTTP ${status})` };
  }

  return {
    success: true,
    status: mapStatus(String(json.status ?? "pending")),
    reference: json.id,
    providerReference: json.provider?.transactionID,
    feeAmount: typeof json.fees?.our === "number" ? json.fees.our : undefined,
    netAmount: typeof json.net === "number" ? json.net : undefined,
  };
}

export interface WalletBalance {
  method: "mpesa" | "emola";
  walletId: string;
  balance: number | null;
  currency: string | null;
}

/** NetShop's public docs don't expose a wallet-balance endpoint, so this
 * always returns empty (shown as "indisponível" in the admin UI) rather
 * than guessing at a URL that doesn't exist. */
export async function getWalletBalances(): Promise<WalletBalance[]> {
  return [];
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined | null): boolean {
  if (!signature) return false;
  const secret = process.env.NETSHOP_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const cleanSignature = signature.trim().replace(/^sha256=/i, "");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanSignature));
  } catch {
    return false;
  }
}
