import { createAdminClient } from "@/lib/supabase/admin";
import * as debitoPay from "@/lib/debito-pay";
import * as zumboPay from "@/lib/zumbopay";
import * as netShop from "@/lib/netshop";
import * as pagar from "@/lib/pagar";
import type { PaymentMethod } from "@/lib/debito-pay";

export type PaymentProviderName = "debito_pay" | "zumbopay" | "netshop";

// Pagar is NOT a selectable "active processor" like the three above — it's
// only ever used for e-Mola charges specifically (see
// resolveChargeProvider below), while everything else keeps going through
// whichever processor is set as active. This keeps payments.provider (and
// getOrderStatus's reconciliation) able to name it without widening every
// admin-settings/B2C-payout code path that deals with PaymentProviderName.
export type ChargeProviderName = PaymentProviderName | "pagar";

// ZumboPay's Visa/Mastercard flow only offers a hosted checkout page with
// their own "ZumboPay" branding clearly visible (confirmed live — even
// embedded in an iframe, the logo still shows) and there is no whitelabel/
// branding option in their API. Since that name must never be shown to a
// customer, card payments are left out of this list while ZumboPay is
// active — only mpesa/emola stay (both a direct STK push, no page at all).
const PROVIDER_METHODS: Record<PaymentProviderName, PaymentMethod[]> = {
  debito_pay: ["mpesa", "emola", "mkesh", "visa_mastercard", "payfast"],
  zumbopay: ["mpesa", "emola"],
  netshop: ["mpesa", "emola", "mkesh", "visa_mastercard"],
};

// Which methods each provider can actually auto-dispatch for producer/
// employee B2C payouts. Debito Pay and ZumboPay only automate M-Pesa;
// NetShop's docs confirm both M-Pesa and e-Mola work for B2C.
const B2C_METHODS: Record<PaymentProviderName, ("mpesa" | "emola")[]> = {
  debito_pay: ["mpesa"],
  zumbopay: ["mpesa"],
  netshop: ["mpesa", "emola"],
};

export async function getActivePaymentProvider(): Promise<PaymentProviderName> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "payment_provider").single();
  if (data?.value === "zumbopay") return "zumbopay";
  if (data?.value === "netshop") return "netshop";
  return "debito_pay";
}

export function providerModule(name: PaymentProviderName) {
  if (name === "zumbopay") return zumboPay;
  if (name === "netshop") return netShop;
  return debitoPay;
}

export function methodsForProvider(name: PaymentProviderName, currency: string): PaymentMethod[] {
  const allowed = PROVIDER_METHODS[name];
  if (currency === "ZAR") return allowed.filter((m) => m === "payfast" || m === "visa_mastercard");
  return allowed.filter((m) => m !== "payfast");
}

export function b2cMethodsForProvider(name: PaymentProviderName): ("mpesa" | "emola")[] {
  return B2C_METHODS[name];
}

function isPagarConfigured(): boolean {
  return Boolean(process.env.PAGAR_API_KEY?.trim() && process.env.PAGAR_SIGNING_SECRET?.trim());
}

// e-Mola charges route through Pagar specifically (per admin's choice —
// everything else keeps using the globally active processor). Falls back
// to the active processor if Pagar's credentials aren't set, so checkout
// never breaks just because that one integration is mid-setup.
export async function resolveChargeProvider(method: PaymentMethod, currency: string): Promise<ChargeProviderName> {
  if (method === "emola" && currency === "MZN" && isPagarConfigured()) return "pagar";
  return getActivePaymentProvider();
}

export function chargeProviderModule(name: ChargeProviderName) {
  if (name === "pagar") return pagar;
  return providerModule(name);
}

// Same routing rule as resolveChargeProvider, applied to B2C payouts
// (producer/CTO/employee withdrawals) instead of incoming charges — Pagar
// absorbs its own payout fee into PagaJá's margin (see PAGAR_PAYOUT_FEE_RATE
// in lib/pagar.ts), so this never reduces what the recipient actually gets.
export async function resolveB2CProvider(method: "mpesa" | "emola", currency: string): Promise<ChargeProviderName> {
  return resolveChargeProvider(method, currency);
}
