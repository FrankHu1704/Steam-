import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

// Called at the top of every /dashboard, /account, and /admin layout — the
// single choke point that also enforces account suspension. A suspension
// set mid-session (see suspendUser() in lib/actions/admin.ts) takes effect
// on this account's very next page load, not just on its next login.
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
    await supabase.auth.signOut();
    redirect(`/conta-suspensa${profile.suspension_reason ? `?motivo=${encodeURIComponent(profile.suspension_reason)}` : ""}`);
  }

  return { user, profile: profile as Profile | null };
}
