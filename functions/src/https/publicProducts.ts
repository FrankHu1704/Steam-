import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "../lib/admin";
import { getSignedDownloadUrl } from "../lib/storage";
import { createDebitoPayCharge, debitoPayApiKey, debitoPayWebhookSecret } from "../lib/debitoPay";
import type { PaymentMethod } from "../types";

const debitoPaySecrets = [debitoPayApiKey, debitoPayWebhookSecret];

interface RegisterViewInput {
  productId: string;
  ref?: string;
}

/** Called when the public product sale page loads. Always counts a view;
 * if `ref` matches a real affiliate link for this product, counts a click
 * too (silently ignored otherwise — no error surfaced to the visitor). */
export const registerProductView = onCall(async (request) => {
  const { productId, ref } = request.data as RegisterViewInput;
  if (!productId) throw new HttpsError("invalid-argument", "productId is required.");

  const productRef = db.collection("products").doc(productId);
  await productRef.update({ viewCount: FieldValue.increment(1) }).catch(() => {
    // product may not exist / may have been deleted — a view counter miss
    // isn't worth failing the page load over.
  });

  if (ref) {
    const linkRef = db.collection("affiliateLinks").doc(`${productId}_${ref}`);
    await linkRef.update({ clicks: FieldValue.increment(1) }).catch(() => {
      // no such affiliate link — ignore.
    });
  }

  return { success: true };
});

interface PurchaseProductInput {
  productId: string;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl?: string;
  ref?: string;
}

/** Public: the product's own permanent sale page posts here directly
 * (no pre-created payment link needed) to create the payment record and
 * kick off the real Debito Pay charge in one step. */
export const purchaseProduct = onCall(
  { secrets: debitoPaySecrets },
  async (request) => {
    const {
      productId,
      paymentMethod,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
      ref,
    } = request.data as PurchaseProductInput;

    if (!productId || !paymentMethod || !customerName || !customerEmail) {
      throw new HttpsError(
        "invalid-argument",
        "productId, paymentMethod, customerName and customerEmail are required."
      );
    }

    const productSnap = await db.collection("products").doc(productId).get();
    if (!productSnap.exists) {
      throw new HttpsError("not-found", "Product not found.");
    }
    const product = productSnap.data()!;
    if (product.status !== "approved" || !product.active) {
      throw new HttpsError("failed-precondition", "This product isn't available for sale.");
    }

    let affiliateUid: string | null = null;
    let affiliateCommissionAmount = 0;
    if (ref && product.affiliateEnabled) {
      const linkSnap = await db.collection("affiliateLinks").doc(`${productId}_${ref}`).get();
      if (linkSnap.exists) {
        affiliateUid = ref;
        affiliateCommissionAmount =
          Math.round(product.price * (linkSnap.data()!.commissionPercent / 100) * 100) / 100;
      }
    }

    const paymentRef = db.collection("payments").doc();

    const rawIp = request.rawRequest.headers["x-forwarded-for"];
    const customerIp = Array.isArray(rawIp) ? rawIp[0] : rawIp?.split(",")[0]?.trim();

    let result;
    try {
      result = await createDebitoPayCharge({
        paymentMethod,
        amount: product.price,
        currency: product.currency,
        sourceId: paymentRef.id,
        customerName,
        customerEmail,
        customerPhone,
        returnUrl,
        customerIp,
        customerUserAgent: request.rawRequest.headers["user-agent"] as string | undefined,
        customerOrigin: request.rawRequest.headers.origin as string | undefined,
      });
    } catch (err) {
      throw new HttpsError("internal", (err as Error).message);
    }

    await paymentRef.set({
      merchantId: product.merchantId,
      productId,
      amount: product.price,
      currency: product.currency,
      paymentMethod,
      status: result.status ?? "pending",
      debitoPayPaymentId: result.payment_id ?? null,
      reference: result.reference ?? null,
      checkoutUrl: result.checkout_url ?? null,
      customerName,
      customerEmail,
      customerPhone: customerPhone ?? null,
      sourceId: paymentRef.id,
      affiliateUid,
      affiliateCommissionAmount,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      creditedAt: null,
    });

    return {
      success: true,
      paymentId: paymentRef.id,
      status: result.status,
      checkoutUrl: result.checkout_url ?? null,
      reference: result.reference ?? null,
    };
  }
);

interface GetDownloadInput {
  paymentId: string;
}

/** Public: the buyer's payment-status page calls this once status is
 * "success" to fetch time-limited download links for the product's files. */
export const getProductDownload = onCall(async (request) => {
  const { paymentId } = request.data as GetDownloadInput;
  if (!paymentId) throw new HttpsError("invalid-argument", "paymentId is required.");

  const paymentSnap = await db.collection("payments").doc(paymentId).get();
  if (!paymentSnap.exists) throw new HttpsError("not-found", "Payment not found.");
  const payment = paymentSnap.data()!;

  if (payment.status !== "success") {
    throw new HttpsError("failed-precondition", "Payment isn't confirmed yet.");
  }
  if (!payment.productId) {
    throw new HttpsError("failed-precondition", "This payment isn't tied to a product.");
  }

  const productSnap = await db.collection("products").doc(payment.productId).get();
  if (!productSnap.exists) throw new HttpsError("not-found", "Product not found.");
  const files = (productSnap.data()?.files ?? []) as { name: string; path: string }[];

  const links = await Promise.all(
    files.map(async (f) => ({ name: f.name, url: await getSignedDownloadUrl(f.path) }))
  );

  return { success: true, files: links };
});
