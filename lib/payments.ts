import { createAdminClient } from "@/lib/supabase/admin";
import * as debitoPay from "@/lib/debito-pay";
import * as zumboPay from "@/lib/zumbopay";
import type { PaymentMethod } from "@/lib/debito-pay";

export type PaymentProviderName = "debito_pay" | "zumbopay";

const PROVIDER_METHODS: Record<PaymentProviderName, PaymentMethod[]> = {
  debito_pay: ["mpesa", "emola", "mkesh", "visa_mastercard", "payfast"],
  zumbopay: ["mpesa", "emola", "visa_mastercard"],
};

export async function getActivePaymentProvider(): Promise<PaymentProviderName> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "payment_provider").single();
  return data?.value === "zumbopay" ? "zumbopay" : "debito_pay";
}

export function providerModule(name: PaymentProviderName) {
  return name === "zumbopay" ? zumboPay : debitoPay;
}

export function methodsForProvider(name: PaymentProviderName, currency: string): PaymentMethod[] {
  const allowed = PROVIDER_METHODS[name];
  if (currency === "ZAR") return allowed.filter((m) => m === "payfast" || m === "visa_mastercard");
  return allowed.filter((m) => m !== "payfast");
}
