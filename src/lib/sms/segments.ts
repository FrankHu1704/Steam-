// GSM 03.38 basic character set (simplified — covers the common printable range).
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
const GSM_EXTENDED = '^{}\\[~]|€'

export function isGsmEncodable(text: string): boolean {
  for (const ch of text) {
    if (!GSM_BASIC.includes(ch) && !GSM_EXTENDED.includes(ch)) return false
  }
  return true
}

export interface SmsMetrics {
  isUnicode: boolean
  length: number
  segments: number
  perSegmentLimit: number
  remainingInSegment: number
}

/** Calculates segment count following GSM-7 (160/153) vs UCS-2 (70/67) rules. */
export function calculateSmsMetrics(text: string): SmsMetrics {
  const isUnicode = !isGsmEncodable(text)
  // Extended GSM chars (^{}\[~]|€) consume 2 characters worth of space.
  const length = isUnicode
    ? [...text].length
    : [...text].reduce((sum, ch) => sum + (GSM_EXTENDED.includes(ch) ? 2 : 1), 0)

  const singleLimit = isUnicode ? 70 : 160
  const concatLimit = isUnicode ? 67 : 153

  let segments: number
  let perSegmentLimit: number
  if (length <= singleLimit) {
    segments = length === 0 ? 1 : 1
    perSegmentLimit = singleLimit
  } else {
    segments = Math.ceil(length / concatLimit)
    perSegmentLimit = concatLimit
  }

  const used = length % perSegmentLimit
  const remainingInSegment = used === 0 ? 0 : perSegmentLimit - used

  return { isUnicode, length, segments, perSegmentLimit, remainingInSegment }
}
