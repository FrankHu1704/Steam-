import crypto from "node:crypto";
import type { PaymentMethod } from "@/lib/debito-pay";

// Server-only module — Pagar (pagar.co.mz) is used ONLY for e-Mola charges
// (see resolveChargeProvider() in lib/payments.ts), not as a globally
// selectable "active processor" like Debito Pay/ZumboPay/NetShop. Mirrors
// https://pagar.co.mz's documented Pagar API:
//   - Auth: GET requests use `Authorization: Bearer <api key>`. POST
//     requests additionally sign the request with the signing secret —
//     HMAC-SHA256 over `timestamp\nnonce\nPOST\n<pathname>\n<sha256(body)>`,
//     sent as `X-Pagar-Timestamp`, `X-Pagar-Nonce`,
//     `X-Pagar-Signature: v1=<hex>` — plus an `Idempotency-Key` so a retried
//     request with the same key+body never creates a second charge.
//   - Charges: POST /payments (amountMzn must be a 20–40000 integer;
//     payerPhone is a local 9-digit number, no +258 prefix).
//   - GET /payments/:id or GET /payments/by-reference/:reference — our own
//     order.id is sent as `reference`, so the webhook path can always look
//     the order back up even before it has stored a payment_id.
//   - Webhook signature: header `Pagar-Signature: t=<unix seconds>,v1=<hex>`,
//     hex = hmac_sha256(webhookSecret, `${timestamp}.${rawBody}`), timestamp
//     must be within 300s of now. `Pagar-Event-Id` is required and must be
//     deduped (webhooks can be redelivered).
//   - Payouts (B2C): POST /payouts. Pagar deducts its own fee (documented
//     example: 8%) from the GROSS amount before the recipient gets it — see
//     createPayout() below for how PagaJá absorbs that instead of shorting
//     the recipient.

function baseUrl() {
  return process.env.PAGAR_API_URL || "https://api.pagar.co.mz/api/v1";
}

async function readResponse(res: Response) {
  const json = await res.json().catch(() => null);
  return { status: res.status, json: json ?? {} };
}

async function pagarGet(path: string) {
  const apiKey = process.env.PAGAR_API_KEY?.trim();
  if (!apiKey) throw new Error("Pagar não configurado.");
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return readResponse(res);
}

async function pagarPost(path: string, body: Record<string, unknown>, idempotencyKey: string) {
  const apiKey = process.env.PAGAR_API_KEY?.trim();
  const signingSecret = process.env.PAGAR_SIGNING_SECRET?.trim();
  if (!apiKey || !signingSecret) throw new Error("Pagar não configurado.");

  const url = `${baseUrl()}${path}`;
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(18).toString("base64url");
  const rawBody = JSON.stringify(body);
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const canonicalPath = new URL(url).pathname;
  const canonical = [timestamp, nonce, "POST", canonicalPath, bodyHash].join("\n");
  const signature = crypto.createHmac("sha256", signingSecret).update(canonical).digest("hex");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "X-Pagar-Timestamp": timestamp,
      "X-Pagar-Nonce": nonce,
      "X-Pagar-Signature": `v1=${signature}`,
    },
    body: rawBody,
  });
  return readResponse(res);
}

// Local 9-digit format ("86XXXXXXX"), no +258 — different from NetShop's
// international msisdn format, per the Pagar docs' own examples.
function toLocalPhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-9);
}

function mapStatus(raw: string): "success" | "pending" | "failed" {
  const s = raw.toUpperCase();
  if (s === "PAID") return "success";
  if (s === "FAILED" || s === "CANCELLED") return "failed";
  // PENDING, PROCESSING, RECONCILIATION_REQUIRED
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
}

export async function createCharge(input: ChargeInput): Promise<ChargeResult> {
  // Card/PayPal only exist inside Pagar's own hosted checkout, not this
  // direct API — the docs are explicit about that. We only ever route
  // e-Mola here (see resolveChargeProvider), but M-Pesa works too if that
  // ever changes.
  if (input.paymentMethod !== "mpesa" && input.paymentMethod !== "emola") {
    throw new Error(`A Pagar só suporta M-Pesa e e-Mola diretamente (pedido: ${input.paymentMethod}).`);
  }
  if (!input.customerPhone) throw new Error("Número de telemóvel é obrigatório para M-Pesa/e-Mola.");
  if (input.currency !== "MZN") throw new Error("A Pagar só processa MZN.");

  const amountMzn = Math.round(input.amount);
  if (amountMzn < 20 || amountMzn > 40_000) {
    throw new Error(`Valor fora do limite da Pagar (20–40 000 MZN): ${amountMzn} MZN.`);
  }

  // Deliberately never sends the real product title, customer name, or
  // email to Pagar — only what's strictly required to process the charge
  // (a generic title, the amount, and the payer's phone number).
  const { status, json } = await pagarPost(
    "/payments",
    {
      reference: input.sourceId,
      title: "Compra PagaJá",
      amountMzn,
      method: input.paymentMethod.toUpperCase(),
      payerPhone: toLocalPhone(input.customerPhone),
    },
    `payment:${input.sourceId}`
  );

  const payment = json?.payment;
  if (!payment?.id) {
    throw new Error(json?.message || json?.error || `Falha no pagamento (HTTP ${status})`);
  }

  return {
    success: true,
    payment_id: payment.id,
    reference: payment.reference ?? input.sourceId,
    status: mapStatus(String(payment.status ?? "PENDING")),
  };
}

interface AuthoritativeStatus {
  status: "success" | "pending" | "failed";
  amount?: number;
  currency?: string;
}

/** GET /payments/:id — used once we already have Pagar's own payment id
 * (stored as payments.provider_payment_id) — mirrors the other providers'
 * polling path in getOrderStatus(). */
export async function getAuthoritativeStatus(paymentId: string): Promise<AuthoritativeStatus> {
  const { json } = await pagarGet(`/payments/${encodeURIComponent(paymentId)}`);
  const payment = json?.payment;
  return {
    status: mapStatus(String(payment?.status ?? "PENDING")),
    amount: typeof payment?.amountMzn === "number" ? payment.amountMzn : undefined,
    currency: typeof payment?.currency === "string" ? payment.currency : undefined,
  };
}

/** GET /payments/by-reference/:reference — the reference is always our own
 * order.id, so the webhook handler can look a payment up even without
 * knowing Pagar's payment id ahead of time (recovery path documented by
 * Pagar itself for exactly this situation). */
export async function getStatusByReference(reference: string): Promise<AuthoritativeStatus> {
  const { json } = await pagarGet(`/payments/by-reference/${encodeURIComponent(reference)}`);
  const payment = json?.payment;
  return {
    status: mapStatus(String(payment?.status ?? "PENDING")),
    amount: typeof payment?.amountMzn === "number" ? payment.amountMzn : undefined,
    currency: typeof payment?.currency === "string" ? payment.currency : undefined,
  };
}

// paymentMethod param kept only so this matches the other providers'
// checkChargeStatus(id, method) call shape (Pagar doesn't need it — unlike
// NetShop, it has no per-method wallet id to select).
export async function checkChargeStatus(paymentId: string, _paymentMethod?: PaymentMethod) {
  const result = await getAuthoritativeStatus(paymentId);
  return { status: result.status };
}

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300;

/** Verifies the `Pagar-Signature: t=<unix seconds>,v1=<hex>` header per
 * Pagar's documented scheme — also rejects stale timestamps (>5min old),
 * exactly as their own reference implementation does. */
export function verifyPagarWebhookSignature(rawBody: string, signatureHeader: string | undefined | null): boolean {
  const secret = process.env.PAGAR_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string])
  );
  const timestamp = parts.t;
  const received = parts.v1;
  if (!timestamp || !received) return false;
  if (!/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(received)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// Documented example rate ("Taxa de 8%: 80 MZN" on a 1000 MZN payout) — the
// response's own feeAmountMzn/netAmountMzn are the source of truth for what
// actually happened; this is only used to gross up the REQUEST amount.
export const PAGAR_PAYOUT_FEE_RATE = 0.08;

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

/** Sends money OUT from PagaJá's Pagar wallet. Unlike the other providers'
 * createPayout(), `input.amount` here is treated as the amount the
 * RECIPIENT should net (matching what producers/employees/the CTO are
 * already promised elsewhere in the app) — this grosses the request up so
 * Pagar's own 8% cut comes out of PagaJá's margin, not the recipient's
 * payout. Pagar rounds its fee up to the nearest MZN, so the actual net can
 * land up to ~1 MZN above target; that small slack is absorbed too rather
 * than corrected with a second payout. */
export async function createPayout(input: PayoutInput): Promise<PayoutResult> {
  if (input.method !== "mpesa" && input.method !== "emola") {
    return { success: false, error: `A Pagar só suporta M-Pesa e e-Mola diretamente (pedido: ${input.method}).` };
  }

  // For very small withdrawals, netting PagaJá's fee then grossing the 8%
  // back up can land under Pagar's own 20 MZN payout floor — clamp up to
  // that floor instead of failing outright, so the recipient gets slightly
  // MORE than promised (never less) and the payout still auto-dispatches.
  const grossAmountMzn = Math.max(20, Math.ceil(input.amount / (1 - PAGAR_PAYOUT_FEE_RATE)));
  if (grossAmountMzn > 40_000) {
    return { success: false, error: `Valor fora do limite da Pagar (20–40 000 MZN): ${grossAmountMzn} MZN.` };
  }

  const reference = `payout-${input.notes ? input.notes.replace(/\s+/g, "-").slice(0, 40) : "pagaja"}-${Date.now()}`;
  const { status, json } = await pagarPost(
    "/payouts",
    {
      reference,
      description: input.notes || "Levantamento PagaJá",
      amountMzn: grossAmountMzn,
      method: input.method.toUpperCase(),
      recipient: { phone: toLocalPhone(input.destination), name: input.recipientName || "Destinatário PagaJá" },
    },
    `payout:${reference}`
  );

  const payout = json?.payout;
  if (!payout?.id) {
    return { success: false, error: json?.message || json?.error || `Falha no pagamento (HTTP ${status})` };
  }

  return {
    success: true,
    status: mapStatus(String(payout.status ?? "PENDING")),
    reference: payout.id,
    providerReference: payout.id,
    feeAmount: typeof payout.feeAmountMzn === "number" ? payout.feeAmountMzn : undefined,
    netAmount: typeof payout.netAmountMzn === "number" ? payout.netAmountMzn : undefined,
  };
}
