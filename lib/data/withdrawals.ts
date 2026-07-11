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
  return typeof data?.value === "number" ? data.value : Number(data?.value ?? 5);
}
