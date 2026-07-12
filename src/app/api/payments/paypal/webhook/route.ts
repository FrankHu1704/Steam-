import { NextRequest, NextResponse } from 'next/server'
import { confirmPayment, failPayment } from '@/lib/payments/service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PayPal webhook (order approved/captured).
 * TODO before production: verify the webhook signature via PayPal's
 * `/v1/notifications/verify-webhook-signature` endpoint using PAYPAL_CLIENT_ID/SECRET.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const transactionId = body?.resource?.custom_id ?? body?.transactionId
  if (!transactionId) return NextResponse.json({ received: false }, { status: 400 })

  const admin = createAdminClient()
  const { data: tx } = await admin.from('transactions').select('id').eq('id', transactionId).eq('payment_method', 'paypal').maybeSingle()
  if (!tx) return NextResponse.json({ received: false }, { status: 404 })

  const eventType = body?.event_type
  if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    await confirmPayment(tx.id, body?.resource?.id)
  } else if (eventType === 'PAYMENT.CAPTURE.DENIED') {
    await failPayment(tx.id, 'PayPal payment denied')
  }

  return NextResponse.json({ received: true })
}
