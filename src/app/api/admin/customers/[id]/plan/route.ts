import { NextRequest, NextResponse } from "next/server";
import { plans, trialPlan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { planId } = await req.json();

  const isValidPlan = planId === null || plans.some((p) => p.id === planId);
  if (!isValidPlan) {
    return NextResponse.json({ message: "Plano inválido." }, { status: 400 });
  }

  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      plan_id: planId,
      status: planId ? "ativo" : "pendente",
      trial_ends_at:
        planId === trialPlan.id
          ? new Date(Date.now() + (trialPlan.trialHours ?? 48) * 60 * 60 * 1000).toISOString()
          : null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
