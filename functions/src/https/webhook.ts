import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../lib/admin";
import { verifyDebitoPaySignature, debitoPayWebhookSecret } from "../lib/debitoPay";

interface DebitoPayWebhookBody {
  event: "payment.completed" | "payment.failed" | "payment.refunded" | "payment.chargeback";
  data: {
    payment_id: string;
    merchant_id: string;
    wallet_code: string;
    amount: number;
    currency: string;
    method: string;
    reference: string;
    paid_at?: string;
  };
  timestamp: string;
}

const PLATFORM_FEE_PERCENT = 0;

/**
 * Register this function's URL in your Debito Pay dashboard under
 * Settings -> Webhooks. Requires DEBITO_PAY_WEBHOOK_SECRET to match the
 * secret shown there, or every request will be rejected with 401.
 */
export const debitoPayWebhook = onRequest(
  { secrets: [debitoPayWebhookSecret] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const signature = req.headers["x-webhook-signature"] as string | undefined;
    const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;

    if (!verifyDebitoPaySignature(rawBody, signature)) {
      logger.warn("Debito Pay webhook signature mismatch");
      res.status(401).send("Invalid signature");
      return;
    }

    const body = req.body as DebitoPayWebhookBody;
    const eventId = `${body.data?.payment_id}:${body.event}:${body.timestamp}`;

    const eventRef = db.collection("webhookEvents").doc(eventId);
    const alreadyProcessed = (await eventRef.get()).exists;
    if (alreadyProcessed) {
      res.status(200).send("OK (duplicate)");
      return;
    }
    await eventRef.set({
      event: body.event,
      data: body.data,
      receivedAt: FieldValue.serverTimestamp(),
    });

    const paymentId = body.data?.payment_id;
    if (!paymentId) {
      res.status(400).send("Missing payment_id");
      return;
    }

    // sourceId was set to our local Firestore payment doc id when the
    // charge was created, and Debito Pay's own payment_id was stored back
    // on that doc in submitPayment — look it up by that field.
    const paymentQuery = await db
      .collection("payments")
      .where("debitoPayPaymentId", "==", paymentId)
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      logger.warn(`No local payment found for debitoPayPaymentId=${paymentId}`);
      res.status(200).send("OK (no matching payment)");
      return;
    }

    const paymentRef = paymentQuery.docs[0].ref;

    await db.runTransaction(async (tx) => {
      const paymentSnap = await tx.get(paymentRef);
      const payment = paymentSnap.data()!;

      if (body.event === "payment.completed") {
        tx.update(paymentRef, {
          status: "success",
          updatedAt: FieldValue.serverTimestamp(),
          completedAt: FieldValue.serverTimestamp(),
        });

        // Idempotent credit: only touch the merchant ledger once per payment.
        if (!payment.creditedAt) {
          const merchantRef = db.collection("merchants").doc(payment.merchantId);
          const net = payment.amount * (1 - PLATFORM_FEE_PERCENT / 100);
          tx.update(merchantRef, {
            balanceAvailable: FieldValue.increment(net),
          });
          tx.update(paymentRef, { creditedAt: FieldValue.serverTimestamp() });
        }
      } else if (body.event === "payment.failed") {
        tx.update(paymentRef, {
          status: "failed",
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (body.event === "payment.refunded" || body.event === "payment.chargeback") {
        tx.update(paymentRef, {
          status: body.event === "payment.refunded" ? "refunded" : "chargeback",
          updatedAt: FieldValue.serverTimestamp(),
        });
        if (payment.creditedAt) {
          const merchantRef = db.collection("merchants").doc(payment.merchantId);
          tx.update(merchantRef, {
            balanceAvailable: FieldValue.increment(-payment.amount),
          });
        }
      }
    });

    res.status(200).send("OK");
  }
);
