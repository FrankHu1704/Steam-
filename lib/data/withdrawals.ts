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
