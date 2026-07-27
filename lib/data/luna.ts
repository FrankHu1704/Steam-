import { createClient } from "@/lib/supabase/server";
import type { LunaMessage } from "@/types/database";

export async function getLunaMessages(producerId: string, limit = 30): Promise<LunaMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("luna_messages")
    .select("*")
    .eq("producer_id", producerId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data as LunaMessage[]) ?? [];
}
