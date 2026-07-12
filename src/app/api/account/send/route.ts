import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { sendSmsSchema } from '@/lib/validations'
import { sendSms } from '@/lib/services/sms-service'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const limit = rateLimit(`send:${auth.profile.id}`, 30, 60_000)
  if (!limit.allowed) return jsonError('Limite de pedidos excedido. Aguarde um momento.', 429)

  const body = await req.json().catch(() => null)
  const parsed = sendSmsSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })

  const outcome = await sendSms({
    userId: auth.profile.id,
    to: parsed.data.to,
    message: parsed.data.message,
    senderId: parsed.data.sender_id ?? auth.profile.default_sender_id,
    flash: parsed.data.flash,
    messageType: 'single',
    scheduledAt: parsed.data.scheduled_at ?? null,
  })

  if (!outcome.ok) {
    const status = outcome.error === 'INSUFFICIENT_CREDITS' ? 402 : outcome.error === 'INVALID_PHONE' ? 422 : 502
    return jsonError(outcome.error ?? 'Falha ao enviar SMS', status)
  }

  return jsonOk({ message_id: outcome.messageId, cost: outcome.cost }, 201)
}
