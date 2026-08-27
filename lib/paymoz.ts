import crypto from "node:crypto";
import type { PaymentMethod } from "@/lib/debito-pay";
import { siteUrl } from "@/lib/email";

// Server-only module — PayMoz (paymozapi.saphirat.co.mz), used for M-Pesa
// AND e-Mola charges via resolveChargeProvider() in lib/payments.ts (like
// Pagar), not as a globally selectable "active processor" — no payout/
// withdrawal endpoint is documented, so it can't fund B2C withdrawals (see
// createPayout() below). Mirrors the PayMoz API docs pasted directly by
// the user:
//   - Auth: `Authorization: Bearer <api key>`.
//   - Charges: POST /payments/direct — immediate/synchronous (no hosted
//     checkout page), requires customerPhone (full 258-prefixed number).
//     Same endpoint and shape for both methods — only `method` differs
//     ("MPESA" vs "EMOLA"). `reference` must be EXACTLY 11 alphanumeric
//     characters and unique — our own order.id (a UUID) doesn't fit that,
//     so this generates its own random 11-char token per charge and
//     stores it as both payments.reference and payments.provider_payment_id,
//     since status lookups (GET /payments/reference/:ref) only work by
//     that reference, never by PayMoz's own internal `id`.
//   - Response includes platformFee/gatewayFee/totalFee/netAmount —
//     totalFee is what PayMoz actually deducts, captured as processorFee.
//   - Webhook: POST body `{ event, data }` (payment.created/success/
//     failed). No signature scheme or secret is documented — since a
//     forged webhook can't be detected, the webhook route (see
//     app/api/webhooks/paymoz/route.ts) NEVER trusts the embedded status
//     and always re-fetches via GET /payments/reference/:ref before
//     crediting anything, same discipline as every other provider here
//     but the only safeguard available at all for this one.

function baseUrl() {
  return process.env.PAYMOZ_API_URL || "https://paymozapi.saphirat.co.mz/api/v1";
}

function apiKey() {
  return process.env.PAYMOZ_API_KEY?.trim();
}

async function request(method: string, path: string, body?: unknown) {
  const key = apiKey();
  if (!key) throw new Error("PayMoz não configurado.");

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json: json ?? {} };
}

const REFERENCE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Exactly 11 alphanumeric characters — PayMoz's own documented format.
function generateReference(): string {
  let result = "";
  for (let i = 0; i < 11; i++) {
    result += REFERENCE_CHARS[crypto.randomInt(REFERENCE_CHARS.length)];
  }
  return result;
}

// PayMoz's docs example uses the full 258-prefixed number
// ("258841234567"), unlike Pagar's local 9-digit format.
function toFullPhone(raw: string): string {
  return `258${raw.replace(/\D/g, "").slice(-9)}`;
}

function mapStatus(raw: string): "success" | "pending" | "failed" {
  const s = raw.toUpperCase();
  if (s === "SUCCESS") return "success";
  if (["FAILED", "CANCELLED", "CANCELED", "EXPIRED", "DECLINED"].includes(s)) return "failed";
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
  processorFee?: number;
  raw?: unknown;
}

// M-Pesa: 84/85 · e-Mola: 86/87 — same convention as every other
// provider in this codebase (see ZumboPay's channel inference). PayMoz's
// API doesn't infer the channel itself — it trusts whatever `method` is
// sent — so this catches a checkout bug (e.g. an e-Mola number charged as
// M-Pesa) before it reaches PayMoz with real money on the line.
function validatePhonePrefix(method: "mpesa" | "emola", phone: string) {
  const prefix = phone.replace(/\D/g, "").slice(-9, -7);
  const expected = method === "mpesa" ? ["84", "85"] : ["86", "87"];
  if (!expected.includes(prefix)) {
    const label = method === "mpesa" ? "M-Pesa (84/85)" : "e-Mola (86/87)";
    throw new Error(`Número inválido para ${label}: ${phone}`);
  }
}

export async function createCharge(input: ChargeInput): Promise<ChargeResult> {
  if (input.paymentMethod !== "mpesa" && input.paymentMethod !== "emola") {
    throw new Error(`O PayMoz só suporta M-Pesa e e-Mola diretamente (pedido: ${input.paymentMethod}).`);
  }
  if (!input.customerPhone) throw new Error("Número de telemóvel é obrigatório.");
  if (input.currency !== "MZN") throw new Error("O PayMoz só processa MZN.");
  validatePhonePrefix(input.paymentMethod, input.customerPhone);

  const reference = generateReference();
  const providerMethod = input.paymentMethod === "emola" ? "EMOLA" : "MPESA";

  // Deliberately never sends the real product title or the customer's
  // name/email — only what /payments/direct strictly needs — same
  // data-minimization policy applied to Pagar/PaySuite.
  const { status, json } = await request("POST", "/payments/direct", {
    amount: input.amount,
    reference,
    method: providerMethod,
    customerPhone: toFullPhone(input.customerPhone),
    callbackUrl: `${siteUrl()}/api/webhooks/paymoz`,
    description: "Compra PayNow",
  });

  const data = json?.data;
  if (json?.status !== "success" || !data?.id) {
    throw new Error(json?.message || `Falha no pagamento (HTTP ${status})`);
  }

  return {
    success: true,
    // PayMoz only supports status lookups by `reference` (GET
    // /payments/reference/:ref), never by its own internal `id` — so the
    // reference is what gets stored as payments.provider_payment_id too.
    payment_id: data.reference ?? reference,
    reference: data.reference ?? reference,
    status: mapStatus(String(data.status ?? "PENDING")),
    processorFee: typeof data.totalFee === "number" ? data.totalFee : undefined,
    raw: json,
  };
}

interface AuthoritativeStatus {
  status: "success" | "pending" | "failed";
  amount?: number;
  currency?: string;
}

/** GET /payments/reference/:ref — the only documented status-lookup path. */
export async function getAuthoritativeStatus(reference: string): Promise<AuthoritativeStatus> {
  const { json } = await request("GET", `/payments/reference/${encodeURIComponent(reference)}`);
  const data = json?.data;
  return {
    status: mapStatus(String(data?.status ?? "PENDING")),
    amount: typeof data?.amount === "number" ? data.amount : undefined,
  };
}

// paymentMethod param kept only so this matches the other providers'
// checkChargeStatus(id, method) call shape — the "id" here is actually
// the stored reference (see createCharge() above).
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

// No payout/withdrawal endpoint is documented anywhere in PayMoz's docs.
// Rather than guess one with real money on the line, this always fails
// gracefully so the withdrawal just stays "pending" for the admin to pay
// manually, exactly like PaySuite.
export async function createPayout(_input: PayoutInput): Promise<PayoutResult> {
  return {
    success: false,
    error: "A criação de levantamentos via API não está documentada pelo PayMoz.",
  };
}
