import { onCall, HttpsError } from "firebase-functions/v2/https";
import { createDebitoPayCharge, debitoPayApiKey, debitoPayWebhookSecret } from "../lib/debitoPay";
import type { PaymentMethod } from "../types";

interface TestChargeInput {
  paymentMethod: PaymentMethod;
  amount: number;
  currency: "MZN" | "ZAR";
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl?: string;
}

/**
 * Isolated integration test: calls Debito Pay's payment-orchestrator
 * directly with the platform's configured credentials, bypassing
 * merchants/products/Firestore entirely. No payment record is saved, so
 * the webhook won't find a match for it (harmless — it just logs and
 * skips). Only for manually verifying DEBITO_PAY_API_KEY /
 * DEBITO_PAY_MERCHANT_ID / DEBITO_PAY_WALLET_CODE are wired correctly —
 * not part of the real checkout flow.
 */
export const testCharge = onCall(
  { secrets: [debitoPayApiKey, debitoPayWebhookSecret] },
  async (request) => {
    const {
      paymentMethod,
      amount,
      currency,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
    } = request.data as TestChargeInput;

    if (!paymentMethod || typeof amount !== "number" || amount <= 0) {
      throw new HttpsError("invalid-argument", "paymentMethod and a positive amount are required.");
    }
    if (!customerName || !customerEmail) {
      throw new HttpsError("invalid-argument", "customerName and customerEmail are required.");
    }
    if (currency !== "MZN" && currency !== "ZAR") {
      throw new HttpsError("invalid-argument", "currency must be MZN or ZAR.");
    }

    try {
      const result = await createDebitoPayCharge({
        paymentMethod,
        amount,
        currency,
        sourceId: `test_${Date.now()}`,
        customerName,
        customerEmail,
        customerPhone,
        returnUrl,
      });
      return { success: true, result };
    } catch (err) {
      throw new HttpsError("internal", (err as Error).message);
    }
  }
);
