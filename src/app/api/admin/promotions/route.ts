import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'

const promoSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  description: z.string().optional(),
  discount_percent: z.number().min(0).max(100).default(0),
  bonus_credits: z.number().int().min(0).default(0),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional().nullable(),
  max_uses: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().default(true),
})

export async function GET() {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const { data } = await auth.supabase.from('promotions').select('*').order('created_at', { ascending: false })
  return jsonOk({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = promoSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })

  const { data, error } = await auth.supabase.from('promotions').insert(parsed.data).select().single()
  if (error) return jsonError('Código de promoção já existe', 409)
  return jsonOk({ data }, 201)
}
