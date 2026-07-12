import { NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  company_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  default_sender_id: z.string().max(11).optional(),
})

export async function GET() {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error
  return jsonOk({ data: auth.profile })
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422)

  const { data, error } = await auth.supabase.from('profiles').update(parsed.data).eq('id', auth.profile.id).select().single()
  if (error) return jsonError('Não foi possível actualizar o perfil', 500)
  return jsonOk({ data })
}
