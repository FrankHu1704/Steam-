import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { confirmPayment } from '@/lib/payments/service'

/**
 * Demo/sandbox-only confirmation endpoint used by the card/PayPal/Stripe
 * placeholder checkout pages when no live gateway credentials are configured
 * (SMS_PROVIDER=mock style local dev). In production, payments must only be
 * confirmed by a verified provider webhook (see /api/payments/[provider]/webhook) —
 * never by a client-triggered call like this one.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  if (!body?.transaction_id) return jsonError('transaction_id em falta', 422)

  const { data: tx } = await auth.supabase
    .from('transactions')
    .select('id, user_id, payment_status')
    .eq('id', body.transaction_id)
    .maybeSingle()

  if (!tx || tx.user_id !== auth.profile.id) return jsonError('Transacção não encontrada', 404)
  if (tx.payment_status === 'completed') return jsonOk({ data: tx })

  const updated = await confirmPayment(tx.id, 'demo-confirmation')
  return jsonOk({ data: updated })
}
