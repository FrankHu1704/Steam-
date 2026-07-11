import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Service-role client — bypasses RLS entirely. Only ever import this in
 * server-only code (route handlers, server actions) that has already
 * checked the caller's role itself (e.g. admin-only actions, or the
 * Debito Pay webhook, which has no user session at all). Never expose
 * SUPABASE_SERVICE_ROLE_KEY to the client. */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
