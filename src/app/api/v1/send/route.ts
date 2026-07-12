import { NextRequest } from 'next/server'
import { authenticateApiRequest, jsonError, jsonOk } from '@/lib/api-auth'
import { sendSmsSchema } from '@/lib/validations'
import { sendSms } from '@/lib/services/sms-service'

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = sendSmsSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })
  }

  const outcome = await sendSms({
    userId: auth.profile.id,
    apiKeyId: auth.apiKeyId,
    to: parsed.data.to,
    message: parsed.data.message,
    senderId: parsed.data.sender_id ?? auth.profile.default_sender_id,
    flash: parsed.data.flash,
    messageType: 'api',
    scheduledAt: parsed.data.scheduled_at ?? null,
  })

  if (!outcome.ok) {
    const status = outcome.error === 'INSUFFICIENT_CREDITS' ? 402 : outcome.error === 'INVALID_PHONE' ? 422 : 502
    return jsonError(outcome.error ?? 'Falha ao enviar SMS', status, { message_id: outcome.messageId })
  }

  return jsonOk({ message_id: outcome.messageId, cost: outcome.cost }, 201)
}
