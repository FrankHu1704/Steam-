import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function provisionCustomer(params: {
  email: string;
  name: string;
  phone: string;
  planId: string;
  trialEndsAt?: string | null;
}) {
  const admin = createAdminClient();

  let customerId: string;

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: params.email,
      email_confirm: true,
      user_metadata: { name: params.name },
    });

  if (created?.user) {
    customerId = created.user.id;
  } else if (
    createError &&
    /already been registered|already registered|already exists/i.test(
      createError.message
    )
  ) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", params.email)
      .single();

    if (!existing) throw createError;
    customerId = existing.id;
  } else {
    throw createError ?? new Error("Falha ao criar utilizador.");
  }

  await admin
    .from("profiles")
    .update({
      name: params.name,
      phone: params.phone,
      plan_id: params.planId,
      status: "ativo",
      trial_ends_at: params.trialEndsAt ?? null,
    })
    .eq("id", customerId);

  return customerId;
}

export async function findProfileByEmail(email: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, plan_id")
    .eq("email", email)
    .single();
  return data;
}

export async function recordOrder(params: {
  customerId: string;
  planId: string;
  amount: number;
  paymentMethod: string;
  paymentId: string;
}) {
  const admin = createAdminClient();

  await admin.from("orders").upsert(
    {
      customer_id: params.customerId,
      plan_id: params.planId,
      amount: params.amount,
      currency: "MZN",
      payment_method: params.paymentMethod,
      payment_id: params.paymentId,
      status: "paid",
    },
    { onConflict: "payment_id", ignoreDuplicates: true }
  );
}

export async function generateLoginLink(email: string, redirectTo: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error || !data) return null;
  return data.properties?.action_link ?? null;
}
