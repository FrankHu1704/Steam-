import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { auth, db, FieldValue } from "../lib/admin";
import { requireAuth } from "../lib/authz";

const bootstrapSecret = defineSecret("ADMIN_BOOTSTRAP_SECRET");

/**
 * One-time-per-admin promotion path. The caller must already be signed in
 * (any Firebase Auth account) and must supply the shared ADMIN_BOOTSTRAP_SECRET
 * configured for this project. Set that secret to a long random value, call
 * this once per admin you want to create, then treat the secret as sensitive.
 */
export const bootstrapAdmin = onCall(
  { secrets: [bootstrapSecret] },
  async (request) => {
    const uid = requireAuth(request);
    const { secret } = request.data as { secret?: string };

    if (!secret || secret !== bootstrapSecret.value()) {
      throw new HttpsError("permission-denied", "Invalid bootstrap secret.");
    }

    await auth.setCustomUserClaims(uid, { role: "admin" });
    await db.collection("users").doc(uid).set(
      {
        uid,
        role: "admin",
        promotedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true };
  }
);
