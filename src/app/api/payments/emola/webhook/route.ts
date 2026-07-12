import { NextRequest, NextResponse } from 'next/server'
import { confirmPayment, failPayment } from '@/lib/payments/service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * e-Mola payment confirmation callback.
 * TODO before production: verify the webhook signature/secret issued by
 * e-Mola for your EMOLA_MERCHANT_ID before trusting the payload.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.transactionId) return NextResponse.json({ received: false }, { status: 400 })

  const admin = createAdminClient()
  const { data: tx } = await admin.from('transactions').select('id').eq('id', body.transactionId).eq('payment_method', 'emola').maybeSingle()
  if (!tx) return NextResponse.json({ received: false }, { status: 404 })

  if (body.status === 'success' || body.success === true) {
    await confirmPayment(tx.id, body.reference)
  } else {
    await failPayment(tx.id, body.message ?? 'e-Mola payment failed')
  }

  return NextResponse.json({ received: true })
}
