import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'MZN') {
  return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-MZ').format(value)
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = {}) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short', ...opts }).format(date)
}

/** Normalizes a Mozambican phone number to E.164 (+258XXXXXXXXX). */
export function normalizeMozPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '')
  let clean = digits.startsWith('+') ? digits.slice(1) : digits

  if (clean.startsWith('258')) {
    // already has country code
  } else if (clean.startsWith('0')) {
    clean = '258' + clean.slice(1)
  } else if (clean.length === 9) {
    clean = '258' + clean
  } else {
    return null
  }

  if (!/^258(8[2-7])\d{7}$/.test(clean)) return null
  return '+' + clean
}

/** Replaces the `{nome}` personalization token with the contact's name (or blank). */
export function personalizeMessage(template: string, name?: string | null) {
  return template.replace(/\{nome\}/gi, name?.trim() || '')
}

export function truncate(text: string, length = 60) {
  return text.length > length ? text.slice(0, length - 1) + '…' : text
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
