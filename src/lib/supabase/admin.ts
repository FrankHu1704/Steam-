import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Server-only, never import from a
// Client Component or expose SUPABASE_SECRET_KEY to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
