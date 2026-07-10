import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "../lib/admin";
import { requireAuth, requireAdmin } from "../lib/authz";

interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  currency: "MZN" | "ZAR";
  imageUrl?: string;
}

export const createProduct = onCall(async (request) => {
  const uid = requireAuth(request);
  const { name, description, price, currency, imageUrl } =
    request.data as CreateProductInput;

  if (!name || typeof price !== "number" || price <= 0) {
    throw new HttpsError("invalid-argument", "name and a positive price are required.");
  }
  if (currency !== "MZN" && currency !== "ZAR") {
    throw new HttpsError("invalid-argument", "currency must be MZN or ZAR.");
  }

  const merchantSnap = await db.collection("merchants").doc(uid).get();
  if (!merchantSnap.exists) {
    throw new HttpsError("failed-precondition", "Merchant profile not found.");
  }

  const ref = await db.collection("products").add({
    merchantId: uid,
    name,
    description: description ?? "",
    price,
    currency,
    imageUrl: imageUrl ?? null,
    status: "pending",
    rejectionReason: null,
    createdAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
  });

  return { success: true, productId: ref.id };
});

interface ReviewProductInput {
  productId: string;
  decision: "approved" | "rejected";
  rejectionReason?: string;
}

export const reviewProduct = onCall(async (request) => {
  const adminUid = requireAdmin(request);
  const { productId, decision, rejectionReason } = request.data as ReviewProductInput;

  if (!productId || (decision !== "approved" && decision !== "rejected")) {
    throw new HttpsError("invalid-argument", "productId and a valid decision are required.");
  }

  const ref = db.collection("products").doc(productId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Product not found.");
  }

  await ref.update({
    status: decision,
    rejectionReason: decision === "rejected" ? rejectionReason ?? "" : null,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: adminUid,
  });

  return { success: true };
});
