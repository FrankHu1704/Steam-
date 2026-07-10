import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "../lib/admin";
import { requireAuth, requireAdmin } from "../lib/authz";

interface UpdateProfileInput {
  businessName: string;
  phone: string;
  currency: "MZN" | "ZAR";
}

/** Merchant completes onboarding info. Account stays "pending" until an
 * admin activates it (approveMerchant) — withdrawals are blocked until then. */
export const updateMerchantProfile = onCall(async (request) => {
  const uid = requireAuth(request);
  const { businessName, phone, currency } = request.data as UpdateProfileInput;

  if (!businessName || !phone) {
    throw new HttpsError("invalid-argument", "businessName and phone are required.");
  }

  await db.collection("merchants").doc(uid).set(
    {
      businessName,
      phone,
      currency: currency === "ZAR" ? "ZAR" : "MZN",
    },
    { merge: true }
  );

  return { success: true };
});

interface ReviewMerchantInput {
  merchantId: string;
  decision: "active" | "suspended";
}

export const reviewMerchant = onCall(async (request) => {
  const adminUid = requireAdmin(request);
  const { merchantId, decision } = request.data as ReviewMerchantInput;

  if (!merchantId || (decision !== "active" && decision !== "suspended")) {
    throw new HttpsError("invalid-argument", "merchantId and a valid decision are required.");
  }

  await db.collection("merchants").doc(merchantId).update({
    status: decision,
    reviewedBy: adminUid,
    reviewedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
