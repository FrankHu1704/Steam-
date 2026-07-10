import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "../lib/admin";
import { requireAuth } from "../lib/authz";

interface BecomeAffiliateInput {
  productId: string;
}

/** Any signed-in merchant can opt in to promote another merchant's
 * affiliate-enabled product. Idempotent — calling again just returns the
 * existing link instead of resetting its stats. */
export const becomeAffiliate = onCall(async (request) => {
  const uid = requireAuth(request);
  const { productId } = request.data as BecomeAffiliateInput;
  if (!productId) throw new HttpsError("invalid-argument", "productId is required.");

  const productSnap = await db.collection("products").doc(productId).get();
  if (!productSnap.exists) throw new HttpsError("not-found", "Product not found.");
  const product = productSnap.data()!;

  if (product.status !== "approved" || !product.affiliateEnabled) {
    throw new HttpsError(
      "failed-precondition",
      "This product doesn't have an affiliate program open."
    );
  }
  if (product.merchantId === uid) {
    throw new HttpsError("failed-precondition", "You can't be an affiliate for your own product.");
  }

  const linkId = `${productId}_${uid}`;
  const linkRef = db.collection("affiliateLinks").doc(linkId);
  const existing = await linkRef.get();

  if (!existing.exists) {
    await linkRef.set({
      productId,
      merchantId: product.merchantId,
      affiliateUid: uid,
      commissionPercent: product.affiliateCommissionPercent,
      clicks: 0,
      sales: 0,
      commissionEarned: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return { success: true, linkId, referralParam: `ref=${uid}` };
});
