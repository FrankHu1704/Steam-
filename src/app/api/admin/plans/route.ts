import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'

const planSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  currency: z.string().default('MZN'),
  credits: z.number().int().nonnegative(),
  price_per_sms: z.number().positive(),
  features: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  is_popular: z.boolean().default(false),
  sort_order: z.number().int().default(0),
})

export async function GET() {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const { data } = await auth.supabase.from('plans').select('*').order('sort_order', { ascending: true })
  return jsonOk({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSession({ requireAdmin: true })
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = planSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })

  const { data, error } = await auth.supabase.from('plans').insert(parsed.data).select().single()
  if (error) return jsonError('Não foi possível criar o plano', 500)
  return jsonOk({ data }, 201)
}
