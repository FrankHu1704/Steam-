const API_URL = process.env.DEBITO_PAY_API_URL;
const API_KEY = process.env.DEBITO_PAY_API_KEY;
const MERCHANT_ID = process.env.DEBITO_PAY_MERCHANT_ID;

export type PaymentMethod = "mpesa" | "emola";

export function isConfigured() {
  return Boolean(API_URL && API_KEY && MERCHANT_ID);
}

async function call(body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/payment-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "X-DebitoPay-Client": "senga-host/1.0",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, body: data as Record<string, unknown> | null };
}

type Wallet = { id: string; payment_method: string; code?: string; currency?: string };

// Wallet IDs are real UUIDs assigned by DebitoPay per merchant — they must
// be looked up via list-wallets, never hardcoded. Cached in-memory per
// server instance; a cold start just re-fetches.
let walletCache: { byMethod: Map<string, string>; expiresAt: number } | null = null;
const WALLET_CACHE_TTL_MS = 5 * 60 * 1000;

async function getWalletId(method: PaymentMethod): Promise<string | null> {
  const now = Date.now();
  if (!walletCache || walletCache.expiresAt < now) {
    const res = await call({ action: "list-wallets", merchant_id: MERCHANT_ID });
    const wallets = (res.body?.wallets as Wallet[] | undefined) ?? [];

    const byMethod = new Map<string, string>();
    for (const w of wallets) {
      let pm = String(w.payment_method || "").toLowerCase();
      if (pm === "card" || pm === "netshop") pm = "visa_mastercard";
      if (pm && w.id) byMethod.set(pm, w.id);
    }
    walletCache = { byMethod, expiresAt: now + WALLET_CACHE_TTL_MS };
  }

  return walletCache.byMethod.get(method) ?? null;
}

export async function processPayment(params: {
  method: PaymentMethod;
  amount: number;
  phone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sourceId: string;
}) {
  const walletId = await getWalletId(params.method);

  if (!walletId) {
    return {
      status: 502,
      body: {
        success: false,
        error: `Nenhuma carteira ${params.method} encontrada para este merchant. Verifique no painel DebitoPay.`,
      },
    };
  }

  return call({
    action: "process",
    environment: "production",
    merchant_id: MERCHANT_ID,
    wallet_id: walletId,
    currency: "MZN",
    source: "senga-host",
    payment_method: params.method,
    amount: params.amount,
    phone: params.phone,
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    customer_phone: params.customerPhone,
    source_id: params.sourceId,
  });
}

export async function checkStatus(paymentId: string) {
  return call({
    action: "check-status",
    payment_id: paymentId,
  });
}
