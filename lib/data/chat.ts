import { createClient } from "@/lib/supabase/server";
import type { CommunityChatMessage } from "@/types/database";

export async function getRecentChatMessages(limit = 100): Promise<CommunityChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data as CommunityChatMessage[]) ?? []).reverse();
}
