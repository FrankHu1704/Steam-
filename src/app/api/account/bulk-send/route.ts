import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { bulkSendSchema } from '@/lib/validations'
import { sendBulkSms } from '@/lib/services/sms-service'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const limit = rateLimit(`bulk:${auth.profile.id}`, 5, 60_000)
  if (!limit.allowed) return jsonError('Limite de pedidos excedido. Aguarde um momento.', 429)

  const body = await req.json().catch(() => null)
  const parsed = bulkSendSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })

  const outcome = await sendBulkSms({
    userId: auth.profile.id,
    recipients: parsed.data.recipients,
    message: parsed.data.message,
    senderId: parsed.data.sender_id ?? auth.profile.default_sender_id,
    flash: parsed.data.flash,
    scheduledAt: parsed.data.scheduled_at ?? null,
    batchName: parsed.data.batch_name,
  })

  if (!outcome.ok) {
    const status = outcome.error === 'NO_VALID_RECIPIENTS' ? 422 : 402
    return jsonError(outcome.error ?? 'Falha ao processar envio em massa', status)
  }

  return jsonOk({ batch_id: outcome.batchId, accepted: outcome.accepted, rejected: outcome.rejected, total_cost: outcome.totalCost }, 201)
}
