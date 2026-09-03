import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

// Called at the top of every /dashboard, /account, and /admin layout — the
// single choke point that also enforces account suspension. A suspension
// set mid-session (see suspendUser() in lib/actions/admin.ts) takes effect
// on this account's very next page load, not just on its next login.
// Redirects to /conta-suspensa, which shows the reason and a "Falar com
// Suporte" / "Terminar sessão" screen — the session itself is left intact
// (see signIn() for the equivalent behavior on login) so that page can
// still identify who's asking and let them end it themselves.
export async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.suspended_at) {
    redirect("/conta-suspensa");
  }

  return { user, profile: profile as Profile | null };
}
