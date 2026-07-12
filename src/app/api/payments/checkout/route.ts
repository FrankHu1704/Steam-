import { NextRequest } from 'next/server'
import { authenticateSession } from '@/lib/api-session'
import { jsonError, jsonOk } from '@/lib/api-auth'
import { purchaseCreditsSchema } from '@/lib/validations'
import { initiatePayment } from '@/lib/payments/service'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const auth = await authenticateSession()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = purchaseCreditsSchema.safeParse(body)
  if (!parsed.success) return jsonError('Dados inválidos', 422, { details: parsed.error.flatten().fieldErrors })

  let credits = parsed.data.credits
  if (parsed.data.plan_id) {
    const admin = createAdminClient()
    const { data: plan } = await admin.from('plans').select('credits').eq('id', parsed.data.plan_id).single()
    if (plan) credits = plan.credits
  }
  if (!credits) return jsonError('É necessário indicar um plano ou quantidade de créditos', 422)

  const result = await initiatePayment({
    userId: auth.profile.id,
    amount: parsed.data.amount,
    credits,
    method: parsed.data.payment_method,
    phone: parsed.data.phone,
    planId: parsed.data.plan_id ?? null,
  })

  return jsonOk({ data: result }, 201)
}
