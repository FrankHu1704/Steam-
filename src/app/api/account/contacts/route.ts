import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { createContactSchema } from '@/lib/validations'
import { normalizeMozPhone } from '@/lib/utils'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const listId = searchParams.get('list_id')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('page_size') ?? '25')))

  let query = auth.supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.profile.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  if (listId) query = query.eq('list_id', listId)

  const { data, count } = await query
  return jsonOk({ data: data ?? [], pagination: { page, page_size: pageSize, total: count ?? 0 } })
}

const bulkImportSchema = z.object({
  contacts: z.array(createContactSchema).max(20000),
})

export async function POST(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)

  // Support both single-contact creation and bulk CSV-import payloads.
  const bulk = bulkImportSchema.safeParse(body)
  if (bulk.success) {
    const rows = bulk.data.contacts
      .map((c) => ({ ...c, phone: normalizeMozPhone(c.phone) }))
      .filter((c): c is typeof c & { phone: string } => !!c.phone)
      .map((c) => ({
        user_id: auth.profile.id,
        name: c.name ?? null,
        phone: c.phone,
        list_id: c.list_id ?? null,
        tags: c.tags ?? [],
      }))

    if (rows.length === 0) return jsonError('Nenhum contacto válido para importar', 422)

    const { data, error } = await auth.supabase.from('contacts').insert(rows).select('id')
    if (error) return jsonError('Falha ao importar contactos', 500)
    return jsonOk({ imported: data?.length ?? 0, skipped: bulk.data.contacts.length - (data?.length ?? 0) }, 201)
  }

  const parsed = createContactSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })

  const phone = normalizeMozPhone(parsed.data.phone)
  if (!phone) return jsonError('Número de telefone inválido', 422)

  const { data, error } = await auth.supabase
    .from('contacts')
    .insert({ user_id: auth.profile.id, name: parsed.data.name ?? null, phone, list_id: parsed.data.list_id ?? null, tags: parsed.data.tags ?? [] })
    .select()
    .single()

  if (error) return jsonError('Não foi possível criar o contacto', 500)
  return jsonOk({ data }, 201)
}
