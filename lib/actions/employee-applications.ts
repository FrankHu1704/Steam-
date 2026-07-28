"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/data/admin";
import { provisionEmployeeAccount } from "@/lib/actions/employees";

export interface SubmitApplicationInput {
  name: string;
  email: string;
  phone: string;
  biNumber: string;
  address: string;
  city: string;
  province: string;
  mpesaNumber: string;
  emolaNumber: string;
  message: string;
}

/** Public — no auth required. Anyone with the application link can submit;
 * an admin still has to approve it before an account actually exists. */
export async function submitEmployeeApplication(input: SubmitApplicationInput): Promise<{ error?: string; ok?: boolean }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const biNumber = input.biNumber.trim();
  const address = input.address.trim();
  const city = input.city.trim();
  const province = input.province.trim();
  const digits = input.phone.replace(/\D/g, "");

  if (!name || !email) return { error: "Nome e email são obrigatórios." };
  if (!biNumber) return { error: "O número do BI é obrigatório." };
  if (!address || !city || !province) return { error: "Endereço, cidade e província são obrigatórios." };
  if (digits.length < 9) return { error: "Indique um número de telemóvel válido." };
  if (!input.mpesaNumber.trim() && !input.emolaNumber.trim()) {
    return { error: "Indique pelo menos um número (M-Pesa ou e-Mola) para pagamento." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("employee_applications").insert({
    name,
    email,
    phone: input.phone.trim(),
    bi_number: biNumber,
    address,
    city,
    province,
    mpesa_number: input.mpesaNumber.trim() || null,
    emola_number: input.emolaNumber.trim() || null,
    message: input.message.trim() || null,
  });
  if (error) return { error: error.message };

  return { ok: true };
}

export async function approveEmployeeApplication(
  applicationId: string,
  commissionPercent: number
): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { data: application } = await supabase
    .from("employee_applications")
    .select("*")
    .eq("id", applicationId)
    .single();
  if (!application) return { error: "Candidatura não encontrada." };
  if (application.status !== "pending") return { error: "Esta candidatura já foi avaliada." };

  const result = await provisionEmployeeAccount({
    name: application.name,
    email: application.email,
    phone: application.phone,
    biNumber: application.bi_number,
    address: application.address,
    city: application.city,
    province: application.province,
    mpesaNumber: application.mpesa_number ?? "",
    emolaNumber: application.emola_number ?? "",
    commissionPercent,
    createdBy: admin.user.id,
  });
  if (result.error) return { error: result.error };

  await supabase
    .from("employee_applications")
    .update({ status: "approved", reviewed_by: admin.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  revalidatePath("/admin/colaboradores");
  return { ok: true };
}

export async function rejectEmployeeApplication(applicationId: string, reason?: string): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("employee_applications")
    .update({
      status: "rejected",
      rejection_reason: reason || null,
      reviewed_by: admin.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("status", "pending");
  if (error) return { error: error.message };

  revalidatePath("/admin/colaboradores");
  return { ok: true };
}
