import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SuspendedAccountScreen } from "@/components/account/suspended-account-screen";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Reached only via the redirect in getCurrentUserAndProfile() (dashboard/
// account/admin layouts) and signIn() (lib/actions/auth.ts) — both fire
// only when profiles.suspended_at is set. Queried directly here (not
// through getCurrentUserAndProfile itself) to avoid a redirect loop, and
// deliberately does NOT sign the session out — the "Terminar sessão"
// button below is what actually ends it, so a suspended user can still
// see this screen instead of just being bounced to /login with no
// explanation.
export default async function ContaSuspensaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("suspended_at, suspension_reason").eq("id", user.id).single();
  if (!profile?.suspended_at) redirect("/dashboard");

  return <SuspendedAccountScreen reason={profile.suspension_reason} />;
}
