import { createAdminClient } from "@/lib/supabase/admin";
import * as debitoPay from "@/lib/debito-pay";
import * as zumboPay from "@/lib/zumbopay";
import * as netShop from "@/lib/netshop";
import * as pagar from "@/lib/pagar";
import * as paysuite from "@/lib/paysuite";
import type { PaymentMethod } from "@/lib/debito-pay";

export type PaymentProviderName = "debito_pay" | "zumbopay" | "netshop";

// Pagar and PaySuite are NOT selectable "active processors" like the three
// above — they're only ever used for e-Mola charges specifically (see
// resolveChargeProvider below), while everything else keeps going through
// whichever processor is set as active. PaySuite additionally has no
// documented B2C payout-creation endpoint, so it can't fund withdrawals —
// its createPayout() (lib/paysuite.ts) always fails gracefully, unlike
// Pagar's real one (lib/pagar.ts). This keeps payments.provider (and
// getOrderStatus's reconciliation) able to name both without widening
// every admin-settings/B2C-payout code path that deals with
// PaymentProviderName.
export type ChargeProviderName = PaymentProviderName | "pagar" | "paysuite";

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

// Global kill switch for e-Mola checkout — independent of which processor
// is active/handling it, for when every e-Mola path (Pagar, NetShop, ...)
// is simultaneously unavailable (account blocked, integration broken) and
// the option needs to disappear from checkout entirely rather than fail
// after the customer already tried to pay.
export async function isEmolaEnabled(): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "emola_enabled").single();
  return data?.value !== false;
}

export async function methodsForProvider(name: PaymentProviderName, currency: string): Promise<PaymentMethod[]> {
  const allowed = PROVIDER_METHODS[name];
  const filtered = currency === "ZAR" ? allowed.filter((m) => m === "payfast" || m === "visa_mastercard") : allowed.filter((m) => m !== "payfast");
  if (!(await isEmolaEnabled())) return filtered.filter((m) => m !== "emola");
  return filtered;
}

export function b2cMethodsForProvider(name: PaymentProviderName): ("mpesa" | "emola")[] {
  return B2C_METHODS[name];
}

function isPagarConfigured(): boolean {
  return Boolean(process.env.PAGAR_API_KEY?.trim() && process.env.PAGAR_SIGNING_SECRET?.trim());
}

export type EmolaChargeProviderSetting = "pagar" | "zumbopay" | "netshop" | "debito_pay" | "paysuite" | "active";

// Which processor e-Mola charges use, independent of the "active
// processor" setting used for every other method — e.g. keep M-Pesa on
// NetShop while routing only e-Mola to ZumboPay, without a global
// processor switch affecting both. "active" explicitly follows whatever's
// set as the active processor above; "pagar" is the long-standing default.
export async function getEmolaChargeProviderSetting(): Promise<EmolaChargeProviderSetting> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "emola_charge_provider").single();
  const value = data?.value;
  if (value === "zumbopay" || value === "netshop" || value === "debito_pay" || value === "paysuite" || value === "active")
    return value;
  return "pagar";
}

// e-Mola charges route through whichever processor emola_charge_provider
// names — "pagar" by default (falls back to the active processor if
// Pagar's credentials aren't set, so checkout never breaks just because
// that one integration is mid-setup), "active" explicitly follows the
// globally active processor, or a specific processor name to pin e-Mola
// there regardless of what's active for everything else.
export async function resolveChargeProvider(method: PaymentMethod, currency: string): Promise<ChargeProviderName> {
  if (method === "emola" && currency === "MZN") {
    const setting = await getEmolaChargeProviderSetting();
    if (setting === "pagar" && isPagarConfigured()) return "pagar";
    if (setting === "zumbopay" || setting === "netshop" || setting === "debito_pay" || setting === "paysuite") return setting;
  }
  return getActivePaymentProvider();
}

export function chargeProviderModule(name: ChargeProviderName) {
  if (name === "pagar") return pagar;
  if (name === "paysuite") return paysuite;
  return providerModule(name);
}

// Same routing rule as resolveChargeProvider, applied to B2C payouts
// (producer/CTO/employee withdrawals) instead of incoming charges — Pagar
// absorbs its own payout fee into PayNow's margin (see PAGAR_PAYOUT_FEE_RATE
// in lib/pagar.ts), so this never reduces what the recipient actually gets.
export async function resolveB2CProvider(method: "mpesa" | "emola", currency: string): Promise<ChargeProviderName> {
  return resolveChargeProvider(method, currency);
}
