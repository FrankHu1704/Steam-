import { createAdminClient } from "@/lib/supabase/admin";
import * as debitoPay from "@/lib/debito-pay";
import * as zumboPay from "@/lib/zumbopay";
import * as netShop from "@/lib/netshop";
import type { PaymentMethod } from "@/lib/debito-pay";

export type PaymentProviderName = "debito_pay" | "zumbopay" | "netshop";

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
