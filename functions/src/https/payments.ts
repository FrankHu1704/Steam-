import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "../lib/admin";
import { requireAuth } from "../lib/authz";
import {
  createDebitoPayCharge,
  checkDebitoPayStatus,
  debitoPayApiKey,
  debitoPayWebhookSecret,
} from "../lib/debitoPay";
import type { PaymentMethod } from "../types";

const debitoPaySecrets = [debitoPayApiKey, debitoPayWebhookSecret];

interface CreatePaymentLinkInput {
  productId?: string;
  amount: number;
  currency: "MZN" | "ZAR";
}

/** Merchant creates a payment intent. The customer completes it separately
 * via `submitPayment`, so the merchant can share {paymentId} as a link
 * without exposing any secret key to the buyer. */
export const createPaymentLink = onCall(async (request) => {
  const uid = requireAuth(request);
  const { productId, amount, currency } = request.data as CreatePaymentLinkInput;

  if (typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "A positive amount is required.");
  }
  if (currency !== "MZN" && currency !== "ZAR") {
    throw new HttpsError("invalid-argument", "currency must be MZN or ZAR.");
  }

  if (productId) {
    const productSnap = await db.collection("products").doc(productId).get();
    if (!productSnap.exists || productSnap.data()?.merchantId !== uid) {
      throw new HttpsError("not-found", "Product not found for this merchant.");
    }
    if (productSnap.data()?.status !== "approved") {
      throw new HttpsError(
        "failed-precondition",
        "Product must be approved before it can be sold."
      );
    }
  }

  const ref = await db.collection("payments").add({
    merchantId: uid,
    productId: productId ?? null,
    amount,
    currency,
    paymentMethod: null,
    status: "awaiting_customer",
    debitoPayPaymentId: null,
    reference: null,
    checkoutUrl: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    creditedAt: null,
  });

  return { success: true, paymentId: ref.id };
});

interface SubmitPaymentInput {
  paymentId: string;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl?: string;
}

/** Public: the buyer fills in their details on the payment link page and
 * this kicks off the real charge against Debito Pay. No Firebase Auth
 * required — anyone with the link can pay. */
export const submitPayment = onCall(
  { secrets: debitoPaySecrets },
  async (request) => {
    const {
      paymentId,
      paymentMethod,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
    } = request.data as SubmitPaymentInput;

    if (!paymentId || !paymentMethod || !customerName || !customerEmail) {
      throw new HttpsError(
        "invalid-argument",
        "paymentId, paymentMethod, customerName and customerEmail are required."
      );
    }

    const ref = db.collection("payments").doc(paymentId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Payment link not found.");
    }
    const payment = snap.data()!;
    if (payment.status !== "awaiting_customer") {
      throw new HttpsError("failed-precondition", "This payment link was already used.");
    }

    const rawIp = request.rawRequest.headers["x-forwarded-for"];
    const customerIp = Array.isArray(rawIp) ? rawIp[0] : rawIp?.split(",")[0]?.trim();

    let result;
    try {
      result = await createDebitoPayCharge({
        paymentMethod,
        amount: payment.amount,
        currency: payment.currency,
        sourceId: paymentId,
        customerName,
        customerEmail,
        customerPhone,
        returnUrl,
        customerIp,
        customerUserAgent: request.rawRequest.headers["user-agent"] as string | undefined,
        customerOrigin: request.rawRequest.headers.origin as string | undefined,
      });
    } catch (err) {
      await ref.update({
        status: "failed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new HttpsError("internal", (err as Error).message);
    }

    await ref.update({
      paymentMethod,
      customerName,
      customerEmail,
      customerPhone: customerPhone ?? null,
      debitoPayPaymentId: result.payment_id ?? null,
      reference: result.reference ?? null,
      checkoutUrl: result.checkout_url ?? null,
      status: result.status ?? "pending",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      status: result.status,
      checkoutUrl: result.checkout_url ?? null,
      reference: result.reference ?? null,
    };
  }
);

/** Public: poll for status; reconciles against Debito Pay if still pending
 * and a debitoPayPaymentId exists, in case the webhook was missed. */
export const checkPaymentStatus = onCall(
  { secrets: debitoPaySecrets },
  async (request) => {
    const { paymentId } = request.data as { paymentId: string };
    if (!paymentId) {
      throw new HttpsError("invalid-argument", "paymentId is required.");
    }

    const ref = db.collection("payments").doc(paymentId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Payment not found.");
    }
    const payment = snap.data()!;

    if (payment.status === "pending" && payment.debitoPayPaymentId) {
      try {
        const statusRes = await checkDebitoPayStatus(payment.debitoPayPaymentId);
        if (statusRes.payment && statusRes.payment.status !== payment.status) {
          await ref.update({
            status: statusRes.payment.status,
            updatedAt: FieldValue.serverTimestamp(),
            completedAt:
              statusRes.payment.status === "success" ? FieldValue.serverTimestamp() : null,
          });
          return { success: true, status: statusRes.payment.status };
        }
      } catch {
        // fall through to the locally-known status; the webhook is the
        // source of truth and reconciliation here is best-effort.
      }
    }

    return { success: true, status: payment.status };
  }
);
