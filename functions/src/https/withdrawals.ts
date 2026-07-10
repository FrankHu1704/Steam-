import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "../lib/admin";
import { requireAuth, requireAdmin } from "../lib/authz";
import { WITHDRAWAL_METHODS, computeWithdrawalFee, type WithdrawalMethod } from "../lib/fees";

interface RequestWithdrawalInput {
  amount: number;
  payoutMethod: WithdrawalMethod;
  destination: string;
}

/** Merchant requests a payout (saque) of their available ledger balance.
 * `amount` is the gross value deducted from balanceAvailable; the merchant
 * actually receives `netAmount` (amount minus the 5% fee) — matches the
 * "Informações sobre Saques" page. The gross amount is immediately moved
 * from balanceAvailable to balancePending so it can't be double-spent
 * while an admin reviews it. */
export const requestWithdrawal = onCall(async (request) => {
  const uid = requireAuth(request);
  const { amount, payoutMethod, destination } = request.data as RequestWithdrawalInput;

  if (typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "A positive amount is required.");
  }
  if (!WITHDRAWAL_METHODS.includes(payoutMethod)) {
    throw new HttpsError(
      "invalid-argument",
      `payoutMethod must be one of: ${WITHDRAWAL_METHODS.join(", ")}.`
    );
  }
  if (!destination) {
    throw new HttpsError("invalid-argument", "destination is required.");
  }

  const { feeAmount, netAmount } = computeWithdrawalFee(amount);

  const merchantRef = db.collection("merchants").doc(uid);
  const withdrawalRef = db.collection("withdrawals").doc();

  await db.runTransaction(async (tx) => {
    const merchantSnap = await tx.get(merchantRef);
    if (!merchantSnap.exists) {
      throw new HttpsError("failed-precondition", "Merchant profile not found.");
    }
    const merchant = merchantSnap.data()!;
    if (merchant.status !== "active") {
      throw new HttpsError(
        "failed-precondition",
        "Merchant account must be active before requesting withdrawals."
      );
    }
    if ((merchant.balanceAvailable ?? 0) < amount) {
      throw new HttpsError("failed-precondition", "Insufficient available balance.");
    }

    tx.update(merchantRef, {
      balanceAvailable: FieldValue.increment(-amount),
      balancePending: FieldValue.increment(amount),
    });

    tx.set(withdrawalRef, {
      merchantId: uid,
      amount,
      feeAmount,
      netAmount,
      currency: merchant.currency ?? "MZN",
      payoutMethod,
      destination,
      status: "pending",
      rejectionReason: null,
      payoutReference: null,
      requestedAt: FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      paidAt: null,
    });
  });

  return { success: true, withdrawalId: withdrawalRef.id, feeAmount, netAmount };
});

interface ReviewWithdrawalInput {
  withdrawalId: string;
  decision: "approved" | "rejected";
  rejectionReason?: string;
}

/** Admin approves or rejects a pending withdrawal. Approval only records
 * the decision — the actual payout (of `netAmount`, after the fee) still
 * happens outside this system (e.g. an ops team wiring funds via the
 * platform's own Debito Pay wallet or Payoneer), finalized separately via
 * `markWithdrawalPaid`. */
export const reviewWithdrawal = onCall(async (request) => {
  const adminUid = requireAdmin(request);
  const { withdrawalId, decision, rejectionReason } = request.data as ReviewWithdrawalInput;

  if (!withdrawalId || (decision !== "approved" && decision !== "rejected")) {
    throw new HttpsError(
      "invalid-argument",
      "withdrawalId and a valid decision are required."
    );
  }

  const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(withdrawalRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Withdrawal not found.");
    }
    const withdrawal = snap.data()!;
    if (withdrawal.status !== "pending") {
      throw new HttpsError("failed-precondition", "Withdrawal already reviewed.");
    }

    if (decision === "rejected") {
      const merchantRef = db.collection("merchants").doc(withdrawal.merchantId);
      tx.update(merchantRef, {
        balanceAvailable: FieldValue.increment(withdrawal.amount),
        balancePending: FieldValue.increment(-withdrawal.amount),
      });
    }

    tx.update(withdrawalRef, {
      status: decision,
      rejectionReason: decision === "rejected" ? rejectionReason ?? "" : null,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: adminUid,
    });
  });

  return { success: true };
});

interface MarkPaidInput {
  withdrawalId: string;
  payoutReference: string;
}

/** Admin confirms the netAmount (after the 5% fee) has actually been sent
 * to the merchant via their chosen payoutMethod. */
export const markWithdrawalPaid = onCall(async (request) => {
  const adminUid = requireAdmin(request);
  const { withdrawalId, payoutReference } = request.data as MarkPaidInput;

  if (!withdrawalId || !payoutReference) {
    throw new HttpsError(
      "invalid-argument",
      "withdrawalId and payoutReference are required."
    );
  }

  const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(withdrawalRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Withdrawal not found.");
    }
    const withdrawal = snap.data()!;
    if (withdrawal.status !== "approved") {
      throw new HttpsError(
        "failed-precondition",
        "Withdrawal must be approved before it can be marked paid."
      );
    }

    const merchantRef = db.collection("merchants").doc(withdrawal.merchantId);
    tx.update(merchantRef, {
      balancePending: FieldValue.increment(-withdrawal.amount),
    });

    tx.update(withdrawalRef, {
      status: "paid",
      payoutReference,
      paidAt: FieldValue.serverTimestamp(),
      reviewedBy: adminUid,
    });
  });

  return { success: true };
});

interface ConfirmReceiptInput {
  withdrawalId: string;
}

/** Merchant confirms the money actually landed in their M-Pesa/e-Mola/
 * Payoneer account, closing the loop after markWithdrawalPaid. */
export const confirmWithdrawalReceipt = onCall(async (request) => {
  const uid = requireAuth(request);
  const { withdrawalId } = request.data as ConfirmReceiptInput;
  if (!withdrawalId) throw new HttpsError("invalid-argument", "withdrawalId is required.");

  const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);
  const snap = await withdrawalRef.get();
  if (!snap.exists || snap.data()?.merchantId !== uid) {
    throw new HttpsError("not-found", "Withdrawal not found for this merchant.");
  }
  if (snap.data()?.status !== "paid") {
    throw new HttpsError("failed-precondition", "Withdrawal must be marked paid first.");
  }

  await withdrawalRef.update({
    status: "confirmed",
    confirmedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
