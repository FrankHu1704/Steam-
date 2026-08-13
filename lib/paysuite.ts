import crypto from "node:crypto";
import type { PaymentMethod } from "@/lib/debito-pay";

// Server-only module — PaySuite (paysuite.tech), used ONLY for e-Mola
// charges via resolveChargeProvider() in lib/payments.ts (like Pagar), not
// as a globally selectable "active processor" — it has no documented
// payout-creation endpoint, so it can't fund B2C withdrawals (see
// createPayout() below). Mirrors the PaySuite API docs pasted directly by
// the user (docs.paysuite.co.mz/paysuite.tech are unreachable from this
// sandbox, so nothing here is guessed):
//   - Auth: `Authorization: Bearer <api token>`.
//   - Charges: POST /payments — amount (MZN), method (mpesa/emola/
//     credit_card, optional — just preselects the channel), reference
//     (our own order.id, max 50 chars), description, return_url,
//     webhook_url. Always returns a checkout_url — PaySuite hosts its own
//     page where the customer enters their mobile number and confirms the
//     PIN, so no phone number is sent upfront (unlike Pagar/ZumboPay's
//     direct STK push).
//   - GET /payments/:id — authoritative status.
//   - Webhook: header `X-Signature` = hex(hmac_sha256(rawBody, secret)).
//     No timestamp header is documented, so there's no replay-window check
//     here (unlike Pagar's `Pagar-Signature: t=...,v1=...`) — the webhook
//     route dedupes via event+data.id in the logs table instead.

function baseUrl() {
  return process.env.PAYSUITE_API_URL || "https://paysuite.tech/api/v1";
}

function apiToken() {
  return process.env.PAYSUITE_API_TOKEN?.trim();
}

async function request(method: string, path: string, body?: unknown) {
  const token = apiToken();
  if (!token) throw new Error("PaySuite não configurado.");

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json: json ?? {} };
}

function mapStatus(raw: string): "success" | "pending" | "failed" {
  const s = raw.toLowerCase();
  if (["paid", "completed", "success"].includes(s)) return "success";
  if (["failed", "cancelled", "canceled", "expired", "declined"].includes(s)) return "failed";
  return "pending";
}

function toPaysuiteMethod(method: PaymentMethod): "mpesa" | "emola" | "credit_card" | undefined {
  if (method === "mpesa") return "mpesa";
  if (method === "emola") return "emola";
  if (method === "visa_mastercard") return "credit_card";
  return undefined;
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
  raw?: unknown;
}

export async function createCharge(input: ChargeInput): Promise<ChargeResult> {
  if (input.currency !== "MZN") throw new Error("A PaySuite só processa MZN.");
  const method = toPaysuiteMethod(input.paymentMethod);
  if (!method) throw new Error(`A PaySuite não suporta "${input.paymentMethod}" diretamente.`);

  // Deliberately never sends the real product title or the customer's
  // name/email/phone — POST /payments doesn't even take those fields
  // directly (only an optional contact_id from a separately-created
  // contact, which this never creates) — same data-minimization policy
  // applied to Pagar (see lib/pagar.ts).
  const webhookUrl = process.env.PAYSUITE_WEBHOOK_URL?.trim() || undefined;
  const { status, json } = await request("POST", "/payments", {
    amount: Math.round(input.amount * 100) / 100,
    method,
    reference: input.sourceId.slice(0, 50),
    description: "Compra PayNow",
    ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
    ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
  });

  const data = json?.data;
  if (json?.status !== "success" || !data?.id) {
    throw new Error(json?.message || `Falha no pagamento (HTTP ${status})`);
  }

  return {
    success: true,
    payment_id: data.id,
    reference: data.reference ?? input.sourceId,
    status: mapStatus(String(data.status ?? "pending")),
    checkout_url: data.checkout_url,
    raw: json,
  };
}

interface AuthoritativeStatus {
  status: "success" | "pending" | "failed";
  amount?: number;
  currency?: string;
}

/** GET /payments/:id — used once we already have PaySuite's own payment id
 * (stored as payments.provider_payment_id), same as the other providers'
 * polling path in getOrderStatus(). */
export async function getAuthoritativeStatus(paymentId: string): Promise<AuthoritativeStatus> {
  const { json } = await request("GET", `/payments/${encodeURIComponent(paymentId)}`);
  const data = json?.data;
  return {
    status: mapStatus(String(data?.status ?? "pending")),
    amount: typeof data?.amount === "number" ? data.amount : undefined,
  };
}

// paymentMethod param kept only so this matches the other providers'
// checkChargeStatus(id, method) call shape — PaySuite doesn't need it.
export async function checkChargeStatus(paymentId: string, _paymentMethod?: PaymentMethod) {
  const result = await getAuthoritativeStatus(paymentId);
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

// PaySuite's docs only show "List Payouts" and "Get Payout" — no
// documented way to CREATE one via the API. Rather than guess an
// endpoint/body shape with real money on the line, this always fails
// gracefully so the withdrawal just stays "pending" for the admin to pay
// manually, exactly like any other processor that can't auto-dispatch a
// given method. Revisit once PaySuite documents payout creation.
export async function createPayout(_input: PayoutInput): Promise<PayoutResult> {
  return {
    success: false,
    error: "A criação de levantamentos via API ainda não está documentada pela PaySuite.",
  };
}

/** Verifies the `X-Signature` header per PaySuite's documented scheme:
 * hex(hmac_sha256(rawBody, secret)). No timestamp is included in the
 * signed payload per their docs, so there's no separate freshness check
 * here (unlike Pagar/ZumboPay). */
export function verifyPaysuiteWebhookSignature(rawBody: string, signatureHeader: string | undefined | null): boolean {
  const secret = process.env.PAYSUITE_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const cleanSignature = signatureHeader.trim().replace(/^sha256=/i, "");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(cleanSignature, "hex"));
  } catch {
    return false;
  }
}
