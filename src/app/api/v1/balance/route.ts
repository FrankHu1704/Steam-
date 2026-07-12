import { NextRequest } from 'next/server'
import { authenticateApiRequest, jsonOk } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if ('error' in auth) return auth.error

  return jsonOk({
    balance: auth.profile.credits,
    currency_unit: 'credits',
    account: auth.profile.company_name || auth.profile.full_name,
  })
}
