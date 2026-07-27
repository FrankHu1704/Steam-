import { createClient } from "@/lib/supabase/server";
import type { PayoutWallet } from "@/types/database";

export async function getPayoutWallets(producerId: string): Promise<PayoutWallet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payout_wallets")
    .select("*")
    .eq("producer_id", producerId)
    .order("created_at", { ascending: true });
  return (data as PayoutWallet[]) ?? [];
}
