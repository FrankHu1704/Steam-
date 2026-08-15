import { createClient } from "@/lib/supabase/server";
import type { Withdrawal } from "@/types/database";

export async function getMyWithdrawals(producerId: string): Promise<Withdrawal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("producer_id", producerId)
    .order("requested_at", { ascending: false });
  return (data as Withdrawal[]) ?? [];
}

export async function getWithdrawalFeePercent(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "withdrawal_fee_percent").single();
  return typeof data?.value === "number" ? data.value : Number(data?.value ?? 20);
}

export async function getWithdrawalMinimumAmount(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "withdrawal_minimum_amount").single();
  return typeof data?.value === "number" ? data.value : Number(data?.value ?? 200);
}

// Platform-wide maintenance switch — turns off new withdrawal requests
// entirely (e.g. while every payout processor is unavailable at once).
// Existing pending/paid withdrawals aren't affected, only new requests.
export async function getWithdrawalsEnabled(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "withdrawals_enabled").single();
  return data?.value !== false;
}

export const WITHDRAWAL_HOURS_LABEL =
  "Segunda a Sexta das 08h00 às 18h30, Sábado e Domingo das 08h00 às 13h30";

// Africa/Maputo is fixed UTC+2 year-round (no DST) — same fixed-offset
// approach as maputoMonthBounds() in lib/cto.ts. Withdrawal requests
// (OTP + the actual request) are only accepted inside this window;
// nothing about already-pending/paid withdrawals is affected.
export function isWithinWithdrawalHours(date: Date = new Date()): boolean {
  const maputo = new Date(date.getTime() + 2 * 60 * 60 * 1000);
  const day = maputo.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const minutesOfDay = maputo.getUTCHours() * 60 + maputo.getUTCMinutes();
  const isWeekend = day === 0 || day === 6;
  const end = isWeekend ? 13 * 60 + 30 : 18 * 60 + 30;
  return minutesOfDay >= 8 * 60 && minutesOfDay <= end;
}
