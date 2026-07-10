import * as functionsV1 from "firebase-functions/v1";
import { db, FieldValue } from "../lib/admin";

/**
 * Every new Firebase Auth user becomes a merchant by default (merchantId ==
 * uid). Admin accounts are created separately via `bootstrapAdmin` /
 * `setMerchantRole` and get their `role` custom claim + users doc flipped
 * to "admin" after this runs.
 */
export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  const batch = db.batch();

  batch.set(db.collection("users").doc(user.uid), {
    uid: user.uid,
    email: user.email ?? "",
    role: "merchant",
    createdAt: FieldValue.serverTimestamp(),
  });

  batch.set(db.collection("merchants").doc(user.uid), {
    uid: user.uid,
    name: user.displayName ?? "",
    businessName: "",
    email: user.email ?? "",
    phone: "",
    status: "pending",
    balanceAvailable: 0,
    balancePending: 0,
    currency: "MZN",
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
});
