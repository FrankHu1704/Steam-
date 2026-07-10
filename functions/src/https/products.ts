import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "../lib/admin";
import { requireAuth, requireAdmin } from "../lib/authz";
import { getSignedDownloadUrl } from "../lib/storage";
import type { ProductFile, ProductType } from "../types";

const PRODUCT_TYPES: ProductType[] = ["ebook", "template", "grupo_privado", "videoaula"];
const MAX_FILES = 5;
const MAX_PREVIEWS = 5;

interface CreateProductInput {
  /** Client-generated Firestore doc id (e.g. via `doc(collection(db,
   * "products")).id`) — needed up front because Storage paths for the
   * product's private files are keyed by productId, and those files are
   * uploaded before this call. */
  productId: string;
  type: ProductType;
  name: string;
  description: string;
  price: number;
  currency: "MZN" | "ZAR";
  coverImageUrl?: string;
  previewImageUrls?: string[];
  files?: ProductFile[];
  affiliateEnabled?: boolean;
  affiliateCommissionPercent?: number;
}

export const createProduct = onCall(async (request) => {
  const uid = requireAuth(request);
  const {
    productId,
    type,
    name,
    description,
    price,
    currency,
    coverImageUrl,
    previewImageUrls,
    files,
    affiliateEnabled,
    affiliateCommissionPercent,
  } = request.data as CreateProductInput;

  if (!productId) {
    throw new HttpsError("invalid-argument", "productId is required.");
  }

  if (!name || typeof price !== "number" || price <= 0) {
    throw new HttpsError("invalid-argument", "name and a positive price are required.");
  }
  if (currency !== "MZN" && currency !== "ZAR") {
    throw new HttpsError("invalid-argument", "currency must be MZN or ZAR.");
  }
  if (!PRODUCT_TYPES.includes(type)) {
    throw new HttpsError("invalid-argument", `type must be one of: ${PRODUCT_TYPES.join(", ")}.`);
  }
  if (!coverImageUrl) {
    throw new HttpsError("invalid-argument", "coverImageUrl is required.");
  }
  if ((previewImageUrls?.length ?? 0) > MAX_PREVIEWS) {
    throw new HttpsError("invalid-argument", `At most ${MAX_PREVIEWS} preview images.`);
  }
  if ((files?.length ?? 0) > MAX_FILES) {
    throw new HttpsError("invalid-argument", `At most ${MAX_FILES} files.`);
  }

  const merchantSnap = await db.collection("merchants").doc(uid).get();
  if (!merchantSnap.exists) {
    throw new HttpsError("failed-precondition", "Merchant profile not found.");
  }

  const commissionPercent = Math.min(90, Math.max(0, affiliateCommissionPercent ?? 20));

  const ref = db.collection("products").doc(productId);
  await ref.create({
    merchantId: uid,
    type,
    name,
    description: description ?? "",
    price,
    currency,
    coverImageUrl,
    previewImageUrls: previewImageUrls ?? [],
    files: files ?? [],
    affiliateEnabled: affiliateEnabled ?? false,
    affiliateCommissionPercent: commissionPercent,
    active: true,
    viewCount: 0,
    salesCount: 0,
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

interface AdminGetFilesInput {
  productId: string;
}

/** Lets an admin inspect a product's files before approving it — a
 * separate path from getProductDownload, which is buyer-only and gated on
 * a confirmed payment. */
export const adminGetProductFiles = onCall(async (request) => {
  requireAdmin(request);
  const { productId } = request.data as AdminGetFilesInput;
  if (!productId) throw new HttpsError("invalid-argument", "productId is required.");

  const snap = await db.collection("products").doc(productId).get();
  if (!snap.exists) throw new HttpsError("not-found", "Product not found.");
  const files = (snap.data()?.files ?? []) as ProductFile[];

  const links = await Promise.all(
    files.map(async (f) => ({ name: f.name, url: await getSignedDownloadUrl(f.path) }))
  );

  return { success: true, files: links };
});

interface ToggleActiveInput {
  productId: string;
  active: boolean;
}

/** Merchant pauses/resumes sales without needing re-approval. A paused
 * product's sale page blocks new purchases. */
export const toggleProductActive = onCall(async (request) => {
  const uid = requireAuth(request);
  const { productId, active } = request.data as ToggleActiveInput;

  const ref = db.collection("products").doc(productId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.merchantId !== uid) {
    throw new HttpsError("not-found", "Product not found for this merchant.");
  }

  await ref.update({ active: !!active });
  return { success: true };
});

interface DeleteProductInput {
  productId: string;
}

/** Blocks deletion once a product has sales, to keep past orders/affiliate
 * ledgers intact — pause it instead via toggleProductActive. */
export const deleteProduct = onCall(async (request) => {
  const uid = requireAuth(request);
  const { productId } = request.data as DeleteProductInput;

  const ref = db.collection("products").doc(productId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.merchantId !== uid) {
    throw new HttpsError("not-found", "Product not found for this merchant.");
  }
  if ((snap.data()?.salesCount ?? 0) > 0) {
    throw new HttpsError(
      "failed-precondition",
      "Products with past sales can't be deleted — pause them instead."
    );
  }

  await ref.delete();
  return { success: true };
});
