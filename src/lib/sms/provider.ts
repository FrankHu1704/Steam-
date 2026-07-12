export interface SendSmsInput {
  to: string
  from: string
  message: string
  flash?: boolean
  unicode?: boolean
}

export interface SendSmsResult {
  success: boolean
  externalId?: string
  error?: string
}

export interface SmsProvider {
  name: string
  send(input: SendSmsInput): Promise<SendSmsResult>
}

/**
 * Development/demo provider — simulates a telecom gateway without making
 * network calls. Swap SMS_PROVIDER=gateway in .env to use a real aggregator.
 */
class MockSmsProvider implements SmsProvider {
  name = 'mock'

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    if (!input.to.startsWith('+258')) {
      return { success: false, error: 'INVALID_DESTINATION' }
    }
    await new Promise((r) => setTimeout(r, 30))
    return { success: true, externalId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }
  }
}

/** Generic HTTP aggregator adapter — configure via env vars for a real SMS gateway. */
class HttpGatewayProvider implements SmsProvider {
  name = 'gateway'

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const url = process.env.SMS_GATEWAY_API_URL
    const apiKey = process.env.SMS_GATEWAY_API_KEY
    if (!url || !apiKey) {
      return { success: false, error: 'GATEWAY_NOT_CONFIGURED' }
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: input.to,
          from: input.from,
          text: input.message,
          flash: input.flash ?? false,
        }),
      })

      if (!res.ok) {
        return { success: false, error: `GATEWAY_HTTP_${res.status}` }
      }

      const data = (await res.json()) as { id?: string }
      return { success: true, externalId: data.id }
    } catch {
      return { success: false, error: 'GATEWAY_UNREACHABLE' }
    }
  }
}

let cachedProvider: SmsProvider | null = null

export function getSmsProvider(): SmsProvider {
  if (cachedProvider) return cachedProvider
  cachedProvider = process.env.SMS_PROVIDER === 'gateway' ? new HttpGatewayProvider() : new MockSmsProvider()
  return cachedProvider
}
