import { NextRequest } from 'next/server'
import { authenticateApiRequest, jsonError, jsonOk } from '@/lib/api-auth'
import { bulkSendSchema } from '@/lib/validations'
import { sendBulkSms } from '@/lib/services/sms-service'

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = bulkSendSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })
  }

  const outcome = await sendBulkSms({
    userId: auth.profile.id,
    apiKeyId: auth.apiKeyId,
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

  return jsonOk(
    {
      batch_id: outcome.batchId,
      accepted: outcome.accepted,
      rejected: outcome.rejected,
      total_cost: outcome.totalCost,
    },
    201
  )
}
