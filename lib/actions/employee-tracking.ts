"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/** Public — called from the signup page when it loads with ?ref=CODE.
 * Best-effort: an unknown/inactive code is silently ignored. */
export async function trackEmployeeClick(referralCode: string): Promise<void> {
  const code = referralCode.trim();
  if (!code) return;

  const supabase = createAdminClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("referral_code", code)
    .eq("active", true)
    .maybeSingle();
  if (!employee) return;

  await supabase.from("employee_link_clicks").insert({ employee_id: employee.id });
}
