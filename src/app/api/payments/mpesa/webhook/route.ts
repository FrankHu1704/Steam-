import { NextRequest, NextResponse } from 'next/server'
import { confirmPayment, failPayment } from '@/lib/payments/service'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * M-Pesa (Vodacom Moçambique) C2B confirmation callback.
 * TODO before production: verify the request originates from the M-Pesa
 * gateway (IP allow-list / shared secret per your MPESA_* credentials) —
 * the sandbox stub below trusts the payload's `transactionId` as-is.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.transactionId) return NextResponse.json({ received: false }, { status: 400 })

  const admin = createAdminClient()
  const { data: tx } = await admin.from('transactions').select('id').eq('id', body.transactionId).eq('payment_method', 'mpesa').maybeSingle()
  if (!tx) return NextResponse.json({ received: false }, { status: 404 })

  if (body.status === 'INS-0' || body.success === true) {
    await confirmPayment(tx.id, body.conversationId ?? body.reference)
  } else {
    await failPayment(tx.id, body.resultDesc ?? 'M-Pesa payment failed')
  }

  return NextResponse.json({ received: true })
}
