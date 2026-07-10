import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "../lib/admin";
import { createDebitoPayCharge, debitoPayApiKey, debitoPayWebhookSecret } from "../lib/debitoPay";
import type { PaymentMethod } from "../types";

const debitoPaySecrets = [debitoPayApiKey, debitoPayWebhookSecret];

interface CreateDonationInput {
  paymentMethod: PaymentMethod;
  amount: number;
  currency: "MZN" | "ZAR";
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  message?: string;
  returnUrl?: string;
}

/** Public: a standalone "buy me a coffee" style donation form (e.g. the
 * Frank AI Solutions site) posts here directly. Money lands in the
 * platform's own Debito Pay wallet — donations aren't tied to any
 * merchant, so there's no ledger credit, just a record for the donor's
 * thank-you/status page. */
export const createDonation = onCall(
  { secrets: debitoPaySecrets },
  async (request) => {
    const {
      paymentMethod,
      amount,
      currency,
      donorName,
      donorEmail,
      donorPhone,
      message,
      returnUrl,
    } = request.data as CreateDonationInput;

    if (!paymentMethod || typeof amount !== "number" || amount <= 0) {
      throw new HttpsError("invalid-argument", "paymentMethod and a positive amount are required.");
    }
    if (!donorName || !donorEmail) {
      throw new HttpsError("invalid-argument", "donorName and donorEmail are required.");
    }
    if (currency !== "MZN" && currency !== "ZAR") {
      throw new HttpsError("invalid-argument", "currency must be MZN or ZAR.");
    }

    const donationRef = db.collection("donations").doc();

    const rawIp = request.rawRequest.headers["x-forwarded-for"];
    const customerIp = Array.isArray(rawIp) ? rawIp[0] : rawIp?.split(",")[0]?.trim();

    let result;
    try {
      result = await createDebitoPayCharge({
        paymentMethod,
        amount,
        currency,
        sourceId: donationRef.id,
        customerName: donorName,
        customerEmail: donorEmail,
        customerPhone: donorPhone,
        returnUrl,
        customerIp,
        customerUserAgent: request.rawRequest.headers["user-agent"] as string | undefined,
        customerOrigin: request.rawRequest.headers.origin as string | undefined,
      });
    } catch (err) {
      throw new HttpsError("internal", (err as Error).message);
    }

    await donationRef.set({
      donorName,
      donorEmail,
      donorPhone: donorPhone ?? null,
      message: message ?? null,
      amount,
      currency,
      paymentMethod,
      status: result.status ?? "pending",
      debitoPayPaymentId: result.payment_id ?? null,
      reference: result.reference ?? null,
      checkoutUrl: result.checkout_url ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
    });

    return {
      success: true,
      donationId: donationRef.id,
      status: result.status,
      checkoutUrl: result.checkout_url ?? null,
      reference: result.reference ?? null,
    };
  }
);

interface CheckDonationInput {
  donationId: string;
}

/** Public: poll for status on the thank-you page. */
export const checkDonationStatus = onCall(async (request) => {
  const { donationId } = request.data as CheckDonationInput;
  if (!donationId) throw new HttpsError("invalid-argument", "donationId is required.");

  const snap = await db.collection("donations").doc(donationId).get();
  if (!snap.exists) throw new HttpsError("not-found", "Donation not found.");

  return { success: true, status: snap.data()!.status };
});
