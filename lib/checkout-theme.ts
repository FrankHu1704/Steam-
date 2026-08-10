// Fixed, server-validated palette for checkout customization — never raw
// CSS/HTML from a producer. The key is what gets stored; the hex is only
// ever resolved from this map, so a malicious key can't inject anything.
export const CHECKOUT_ACCENT_COLORS = {
  blue: "#2563EB",
  purple: "#7C3AED",
  green: "#16A34A",
  pink: "#DB2777",
  orange: "#EA580C",
  teal: "#0D9488",
  gold: "#CA8A04",
  black: "#18181B",
} as const;

export type CheckoutAccentColorKey = keyof typeof CHECKOUT_ACCENT_COLORS;

export function isValidAccentColorKey(value: string): value is CheckoutAccentColorKey {
  return Object.prototype.hasOwnProperty.call(CHECKOUT_ACCENT_COLORS, value);
}

export function resolveAccentColor(key: string | null | undefined): string | null {
  if (!key || !isValidAccentColorKey(key)) return null;
  return CHECKOUT_ACCENT_COLORS[key];
}

export const MAX_HIGHLIGHT_TEXT_LENGTH = 80;
