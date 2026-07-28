"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/data/admin";
import { normalizeMozambiquePhone } from "@/lib/phone";
import { sendEmployeeWelcomeEmail, siteUrl } from "@/lib/email";

function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 10);
}

export interface ProvisionEmployeeInput {
  name: string;
  email: string;
  phone: string;
  biNumber: string;
  address: string;
  city: string;
  province: string;
  mpesaNumber: string;
  emolaNumber: string;
  commissionPercent: number;
  createdBy: string | null;
}

/** Core account-creation logic shared by the admin "Criar Colaborador" form
 * and approving a self-service application — always the final step, either
 * way, only an admin can trigger it. */
export async function provisionEmployeeAccount(
  input: ProvisionEmployeeInput
): Promise<{ error?: string; ok?: boolean; referralLink?: string }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const biNumber = input.biNumber.trim();
  const address = input.address.trim();
  const city = input.city.trim();
  const province = input.province.trim();
  if (!name || !email) return { error: "Nome e email são obrigatórios." };
  if (!biNumber) return { error: "O número do BI é obrigatório." };
  if (!address || !city || !province) return { error: "Endereço, cidade e província são obrigatórios." };
  const digits = input.phone.replace(/\D/g, "");
  if (digits.length < 9) return { error: "Indique um número de telemóvel válido." };
  const phone = normalizeMozambiquePhone(input.phone);

  const mpesaNumber = input.mpesaNumber.trim();
  const emolaNumber = input.emolaNumber.trim();
  if (!mpesaNumber && !emolaNumber) {
    return { error: "Indique pelo menos um número (M-Pesa ou e-Mola) para pagamento." };
  }

  const supabase = createAdminClient();

  let referralCode = generateReferralCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabase.from("employees").select("id").eq("referral_code", referralCode).maybeSingle();
    if (!clash) break;
    referralCode = generateReferralCode();
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created.user) {
    return { error: createError?.message ?? "Não foi possível criar a conta." };
  }

  const { error: insertError } = await supabase.from("employees").insert({
    user_id: created.user.id,
    name,
    email,
    phone,
    bi_number: biNumber,
    address,
    city,
    province,
    mpesa_number: mpesaNumber ? normalizeMozambiquePhone(mpesaNumber) : null,
    emola_number: emolaNumber ? normalizeMozambiquePhone(emolaNumber) : null,
    referral_code: referralCode,
    commission_percent: Math.min(90, Math.max(0, input.commissionPercent)),
    created_by: input.createdBy,
  });
  if (insertError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return { error: insertError.message };
  }

  const referralLink = `${siteUrl()}/signup?ref=${referralCode}`;
  await sendEmployeeWelcomeEmail({ email, name, tempPassword, referralLink });

  revalidatePath("/admin/colaboradores");
  return { ok: true, referralLink };
}

export async function createEmployee(input: Omit<ProvisionEmployeeInput, "createdBy">) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  return provisionEmployeeAccount({ ...input, createdBy: admin.user.id });
}

export async function toggleEmployeeActive(employeeId: string, active: boolean) {
  const admin = await requireAdminUser();
  if (!admin) return { error: "Acesso negado." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("employees").update({ active }).eq("id", employeeId);
  if (error) return { error: error.message };

  revalidatePath("/admin/colaboradores");
  return { ok: true };
}
