import { NextRequest } from 'next/server'
import { authenticateApiRequest, jsonError, jsonOk } from '@/lib/api-auth'
import { createContactSchema } from '@/lib/validations'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeMozPhone } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('page_size') ?? '50')))
  const search = searchParams.get('search')

  const admin = createAdminClient()
  let query = admin
    .from('contacts')
    .select('id, name, phone, tags, list_id, created_at', { count: 'exact' })
    .eq('user_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)

  const { data, count } = await query
  return jsonOk({ data: data ?? [], pagination: { page, page_size: pageSize, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = createContactSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })

  const phone = normalizeMozPhone(parsed.data.phone)
  if (!phone) return jsonError('Número de telefone inválido', 422)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('contacts')
    .insert({
      user_id: auth.profile.id,
      name: parsed.data.name ?? null,
      phone,
      list_id: parsed.data.list_id ?? null,
      tags: parsed.data.tags ?? [],
    })
    .select('id, name, phone, tags, list_id, created_at')
    .single()

  if (error) return jsonError('Não foi possível criar o contacto', 500)
  return jsonOk({ data }, 201)
}
