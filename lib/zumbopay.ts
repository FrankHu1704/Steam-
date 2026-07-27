import crypto from "node:crypto";
import type { PaymentMethod } from "@/lib/debito-pay";

// Server-only module — second payment processor alongside Debito Pay,
// selectable via settings.payment_provider. Mirrors the contract of
// ZumboPay's own WooCommerce plugin:
//   - M-Pesa/e-Mola: POST /charges — direct STK push, no hosted checkout.
//   - Card (Visa/Mastercard): POST /payments — hosted checkout (3DS/OTP).
//   - Webhook signature: hex(hmac_sha256(`${timestamp}.${rawBody}`, secret)).
// CRITICAL: e-Mola requires the customer to confirm a PIN on their phone —
// never mark an order paid without proof of that (pin_verified /
// pin_confirmed_at / provider_status). See getAuthoritativeStatus below.

function baseUrl() {
  return process.env.ZUMBOPAY_API_URL || "https://zumbopay.com/api/public/v1";
}

function apiKey() {
  return process.env.ZUMBOPAY_API_KEY?.trim();
}

function walletIdForMethod(method: PaymentMethod): string {
  const byMethod: Partial<Record<PaymentMethod, string | undefined>> = {
    mpesa: process.env.ZUMBOPAY_WALLET_MPESA,
    emola: process.env.ZUMBOPAY_WALLET_EMOLA,
    visa_mastercard: process.env.ZUMBOPAY_WALLET_CARD,
  };
  const id = byMethod[method];
  if (!id) {
    throw new Error(`Nenhuma carteira configurada para "${method}".`);
  }
  return id;
}

async function request(method: string, path: string, body?: unknown) {
  const key = apiKey();
  if (!key) throw new Error("Processador de pagamento não configurado.");

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(process.env.ZUMBOPAY_MERCHANT_ID ? { "X-Merchant-Id": process.env.ZUMBOPAY_MERCHANT_ID } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json ?? {} };
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

function mapStatus(raw: string): "success" | "pending" | "failed" {
  const s = raw.toLowerCase();
  if (["success", "completed", "paid"].includes(s)) return "success";
  if (["failed", "cancelled", "expired"].includes(s)) return "failed";
  return "pending";
}

export async function createCharge(input: ChargeInput): Promise<ChargeResult> {
  const walletId = walletIdForMethod(input.paymentMethod);

  // M-Pesa/e-Mola: direct STK push, stays entirely in our own checkout UI.
  if (input.paymentMethod === "mpesa" || input.paymentMethod === "emola") {
    if (!input.customerPhone) throw new Error("Número de telemóvel é obrigatório para M-Pesa/e-Mola.");
    const { status, body } = await request("POST", "/charges", {
      wallet_id: walletId,
      amount: input.amount,
      msisdn: input.customerPhone.replace(/\D/g, "").slice(-9),
      customer_name: input.customerName,
      source_id: input.sourceId,
    });
    const data = body?.data ?? {};
    const reference = data.reference as string | undefined;
    if (!reference) {
      throw new Error(body?.error?.message || body?.error || `Falha no pagamento (HTTP ${status})`);
    }
    return {
      success: true,
      payment_id: reference,
      reference,
      status: mapStatus(String(data.status ?? "pending")),
    };
  }

  // Card (Visa/Mastercard): hosted checkout (3DS/OTP).
  const { status, body } = await request("POST", "/payments", {
    type: "link",
    title: "PagaJá",
    amount: input.amount,
    currency: input.currency,
    channels: ["card"],
    wallet_id: walletId,
    description: "Compra na PagaJá",
    source: "pagaja",
    source_id: input.sourceId,
    return_url: input.returnUrl,
    callback_url: input.returnUrl,
  });
  const checkoutUrl = body?.checkout_url ?? body?.data?.checkout_url;
  const reference = body?.data?.reference ?? body?.reference;
  if (!checkoutUrl || !reference) {
    throw new Error(body?.error?.message || body?.error || `Falha no pagamento (HTTP ${status})`);
  }
  return { success: true, payment_id: reference, reference, status: "pending", checkout_url: checkoutUrl };
}

function emolaPinConfirmed(data: Record<string, unknown>): boolean {
  if (data.pin_verified) return true;
  if (data.pin_confirmed) return true;
  if (data.pin_confirmed_at) return true;
  const providerStatus = String(data.provider_status ?? "").toUpperCase();
  if (["PIN_CONFIRMED", "COMPLETED_WITH_PIN", "AUTHORIZED_BY_PIN", "SUCCESS"].includes(providerStatus)) return true;
  const meta = data.metadata as Record<string, unknown> | undefined;
  if (meta && (meta.pin_verified || meta.emola_pin_ok)) return true;
  return false;
}

/** Authoritative status via GET /payments/{reference}, with the e-Mola
 * PIN guard applied — never reports "success" for e-Mola without proof. */
export async function getAuthoritativeStatus(
  reference: string
): Promise<{ status: "success" | "pending" | "failed"; amount?: number; currency?: string }> {
  const encoded = encodeURIComponent(reference);
  const { body } = await request("GET", `/payments/${encoded}`);
  const data = (body?.data ?? body?.payment ?? {}) as Record<string, unknown>;
  const status = mapStatus(String(data.status ?? ""));
  const channel = String(data.channel ?? data.method ?? "").toLowerCase();

  if (status === "success" && channel === "emola" && !emolaPinConfirmed(data)) {
    return { status: "pending" };
  }

  return {
    status,
    amount: typeof data.amount === "number" ? data.amount : undefined,
    currency: typeof data.currency === "string" ? data.currency : undefined,
  };
}

export async function checkChargeStatus(paymentId: string) {
  const result = await getAuthoritativeStatus(paymentId);
  return { status: result.status };
}

interface PayoutInput {
  method: "mpesa" | "emola";
  amount: number;
  destination: string;
  notes?: string;
  /** Only supported for method="mpesa" — instant B2C, synchronous result. */
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

/** Sends money OUT from PagaJá's own ZumboPay wallet to a producer's phone
 * — the payout side, used to automate withdrawal payouts. Real money
 * movement: requires the PagaJá merchant account to have passed KYC. */
export async function createPayout(input: PayoutInput): Promise<PayoutResult> {
  const walletId =
    input.method === "mpesa" ? process.env.ZUMBOPAY_WALLET_MPESA : process.env.ZUMBOPAY_WALLET_EMOLA;
  if (!walletId) {
    return { success: false, error: `Nenhuma carteira configurada para "${input.method}".` };
  }

  const { status, body } = await request("POST", "/payouts", {
    wallet_id: walletId,
    amount: input.amount,
    method: input.method,
    destination: input.destination.replace(/\D/g, "").slice(-9),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.autoDispatch ? { auto_dispatch: true } : {}),
  });

  const data = body?.data;
  if (!data) {
    return { success: false, error: body?.error?.message || body?.error || `Falha no pagamento (HTTP ${status})` };
  }

  return {
    success: true,
    status: mapStatus(String(data.status ?? "pending")),
    reference: data.reference,
    providerReference: data.provider_reference,
    feeAmount: data.fee_amount,
    netAmount: data.net_amount,
  };
}

export interface WalletBalance {
  method: "mpesa" | "emola";
  walletId: string;
  balance: number | null;
  currency: string | null;
}

/** Best-effort read of the merchant's own ZumboPay wallet balances (GET
 * /wallets), matched against the wallet IDs configured in env. The exact
 * field name for the balance isn't confirmed against ZumboPay's real API
 * response yet, so this tries a few common shapes and falls back to
 * `balance: null` (shown as "indisponível" in the admin UI) rather than
 * guessing wrong. */
export async function getWalletBalances(): Promise<WalletBalance[]> {
  const wallets: { method: "mpesa" | "emola"; walletId: string | undefined }[] = [
    { method: "mpesa", walletId: process.env.ZUMBOPAY_WALLET_MPESA },
    { method: "emola", walletId: process.env.ZUMBOPAY_WALLET_EMOLA },
  ];

  const { body } = await request("GET", "/wallets");
  const rows = (body?.data ?? body?.wallets ?? []) as Record<string, unknown>[];

  return wallets
    .filter((w) => w.walletId)
    .map((w) => {
      const row = rows.find((r) => r.id === w.walletId || r.wallet_id === w.walletId);
      const rawBalance = row?.balance ?? row?.available_balance ?? row?.balance_amount;
      return {
        method: w.method,
        walletId: w.walletId!,
        balance: typeof rawBalance === "number" ? rawBalance : null,
        currency: typeof row?.currency === "string" ? row.currency : null,
      };
    });
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined | null, timestamp: string | undefined | null): boolean {
  if (!signature || !timestamp) return false;
  const secret = process.env.ZUMBOPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const tsNum = Number(timestamp);
  if (!tsNum || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const cleanSignature = signature.trim().replace(/^sha256=/i, "");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanSignature));
  } catch {
    return false;
  }
}
