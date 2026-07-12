const API_URL = process.env.DEBITO_PAY_API_URL;
const API_KEY = process.env.DEBITO_PAY_API_KEY;
const MERCHANT_ID = process.env.DEBITO_PAY_MERCHANT_ID;

export type PaymentMethod = "mpesa" | "emola";

const WALLET_BY_METHOD: Record<PaymentMethod, string | undefined> = {
  mpesa: process.env.DEBITO_PAY_MPESA_WALLET_ID,
  emola: process.env.DEBITO_PAY_EMOLA_WALLET_ID,
};

export function isConfigured() {
  return Boolean(API_URL && API_KEY && MERCHANT_ID);
}

export function walletFor(method: PaymentMethod) {
  return WALLET_BY_METHOD[method];
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

export async function processPayment(params: {
  method: PaymentMethod;
  amount: number;
  phone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sourceId: string;
}) {
  const walletId = walletFor(params.method);

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
