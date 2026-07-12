import { NextRequest } from 'next/server'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { logAudit } from '@/lib/services/audit'
import { rateLimit } from '@/lib/rate-limit'

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  company: z.string().max(120).optional(),
  message: z.string().min(10).max(2000),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const limit = rateLimit(`contact:${ip}`, 5, 60_000)
  if (!limit.allowed) return jsonError('Demasiados pedidos. Tente novamente em breve.', 429)

  const body = await req.json().catch(() => null)
  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })

  await logAudit({
    action: 'contact.message_received',
    entityType: 'contact_form',
    metadata: parsed.data,
    ipAddress: ip,
  })

  return jsonOk({ received: true })
}
