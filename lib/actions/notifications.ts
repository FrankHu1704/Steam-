"use server";

import { createClient } from "@/lib/supabase/server";

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Precisa de iniciar sessão." };

  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  return { ok: true };
}
