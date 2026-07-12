import { calculateSmsMetrics } from './segments'

export interface PricingConfig {
  basePricePerSms: number
  unicodeMultiplier: number
}

export const DEFAULT_PRICING: PricingConfig = {
  basePricePerSms: 1.5,
  unicodeMultiplier: 2,
}

/** Cost (in credits) for a single message, accounting for segments and unicode. */
export function calculateSmsCost(message: string, pricing: PricingConfig = DEFAULT_PRICING) {
  const metrics = calculateSmsMetrics(message)
  const unitPrice = metrics.isUnicode ? pricing.basePricePerSms * pricing.unicodeMultiplier : pricing.basePricePerSms
  const cost = Math.round(unitPrice * metrics.segments * 100) / 100
  return { ...metrics, unitPrice, cost }
}
