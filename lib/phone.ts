export function normalizeMozambiquePhone(phone: string): string {
  const trimmed = phone.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  // Already has the country code, just missing the "+" (e.g. "258849311757").
  if (trimmed.startsWith("258") && trimmed.length > 9) return `+${trimmed}`;
  // Bare local number (e.g. "849311757" or "0849311757").
  const digits = trimmed.replace(/^0+/, "");
  return `+258${digits}`;
}
