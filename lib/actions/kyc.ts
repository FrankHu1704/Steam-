"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/auth";

export async function submitKycDocuments(input: { frontPath: string; backPath: string }): Promise<ActionResult> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Precisa de iniciar sessão." };
  if (!input.frontPath || !input.backPath) {
    return { error: "É preciso anexar a foto da frente e do verso do documento." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      kyc_status: "pending",
      kyc_document_front_path: input.frontPath,
      kyc_document_back_path: input.backPath,
      kyc_submitted_at: new Date().toISOString(),
      kyc_rejection_reason: null,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  await supabase.from("logs").insert({
    action: "kyc_submitted",
    target_table: "profiles",
    target_id: user.id,
  });

  return {};
}
