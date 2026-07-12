import { NextRequest, NextResponse } from 'next/server'
import { resolveApiKey } from '@/lib/services/api-keys'
import { rateLimit } from '@/lib/rate-limit'

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status })
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status })
}

/**
 * Authenticates a public API request via the `Authorization: Bearer <key>`
 * (or `X-API-Key`) header and applies a per-key rate limit.
 */
export async function authenticateApiRequest(req: NextRequest) {
  const header = req.headers.get('authorization') ?? ''
  const rawKey = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : req.headers.get('x-api-key') ?? ''

  if (!rawKey) {
    return { error: jsonError('Chave API em falta. Envie Authorization: Bearer <api_key>.', 401) }
  }

  const resolved = await resolveApiKey(rawKey)
  if (!resolved) {
    return { error: jsonError('Chave API inválida ou revogada.', 401) }
  }

  const limit = rateLimit(`apikey:${resolved.apiKeyId}`, 60, 60_000)
  if (!limit.allowed) {
    return { error: jsonError('Limite de pedidos excedido. Tente novamente em breve.', 429) }
  }

  return { apiKeyId: resolved.apiKeyId, profile: resolved.profile }
}
