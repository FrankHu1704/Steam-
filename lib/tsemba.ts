// Tsemba (SMS/WhatsApp/Email gateway) — balance check, shared account with
// lib/sms.ts and lib/whatsapp.ts.

const TSEMBA_BASE_URL = process.env.TSEMBA_API_URL || "https://hdxqelinqivwgmggolhs.supabase.co/functions/v1/api-gateway";

export interface TsembaBalance {
  units: { sms: number; whatsapp: number; email: number };
  wallet: Record<string, { balance: number; currency: string }>;
  totalUnits: number;
}

export async function getTsembaBalance(): Promise<TsembaBalance | null> {
  const apiKey = process.env.TSEMBA_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${TSEMBA_BASE_URL}/balance`, {
      headers: { "x-api-key": apiKey },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return null;

    return {
      units: {
        sms: Number(json.units?.sms ?? 0),
        whatsapp: Number(json.units?.whatsapp ?? 0),
        email: Number(json.units?.email ?? 0),
      },
      wallet: (json.wallet ?? {}) as Record<string, { balance: number; currency: string }>,
      totalUnits: Number(json.total_units ?? 0),
    };
  } catch {
    return null;
  }
}
