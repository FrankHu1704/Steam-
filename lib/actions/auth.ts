"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMozambiquePhone } from "@/lib/phone";
import { siteUrl } from "@/lib/email";

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next ?? "/dashboard")}`,
    },
  });
  if (error || !data?.url) {
    redirect("/login?error=google_auth_failed");
  }
  redirect(data.url);
}

export interface ActionResult {
  error?: string;
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const birthDateRaw = String(formData.get("birthDate") ?? "").trim();

  if (!name || !email || !password || !phoneRaw || !birthDateRaw) {
    return { error: "Preencha nome, data de nascimento, telefone e palavra-passe." };
  }
  if (password.length < 6) {
    return { error: "A palavra-passe deve ter pelo menos 6 caracteres." };
  }
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 9) {
    return { error: "Indique um número de telemóvel válido." };
  }
  const birthDate = new Date(birthDateRaw);
  if (Number.isNaN(birthDate.getTime())) {
    return { error: "Indique uma data de nascimento válida." };
  }
  const ageYears = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears < 16) {
    return { error: "É preciso ter pelo menos 16 anos para criar conta." };
  }
  const phone = normalizeMozambiquePhone(phoneRaw);
  const referralCode = String(formData.get("ref") ?? "").trim();
  const producerReferralId = String(formData.get("pref") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone, birth_date: birthDateRaw },
    },
  });

  if (error) return { error: error.message };

  const admin = createAdminClient();

  if (referralCode && data.user) {
    const { data: employee } = await admin
      .from("employees")
      .select("id")
      .eq("referral_code", referralCode)
      .eq("active", true)
      .maybeSingle();
    if (employee) {
      await admin.from("profiles").update({ recruited_by_employee_id: employee.id }).eq("id", data.user.id);
    }
  }

  // Producers can also recruit affiliates via their own /signup?pref=<id>
  // link — see lib/order-fulfillment.ts for the resulting 3%/1-month payout.
  if (producerReferralId && data.user) {
    const { data: producer } = await admin
      .from("profiles")
      .select("id")
      .eq("id", producerReferralId)
      .eq("role", "producer")
      .maybeSingle();
    if (producer) {
      await admin.from("profiles").update({ recruited_by_producer_id: producer.id }).eq("id", data.user.id);
    }
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  let email = identifier;
  if (!identifier.includes("@")) {
    // Treat as a phone number — resolve to the underlying account's email,
    // since Supabase Auth here is keyed by email/password. Phone numbers
    // are no longer required to be unique (an admin can share one across
    // accounts, e.g. a family member's number), so this only works when
    // the number maps to exactly one account.
    const admin = createAdminClient();
    const phone = normalizeMozambiquePhone(identifier);
    const { data: matches } = await admin.from("profiles").select("email").eq("phone", phone);
    if (!matches || matches.length === 0) return { error: "Email ou palavra-passe incorretos." };
    if (matches.length > 1) {
      return { error: "Este número está associado a mais de uma conta. Entre com o email dessa conta." };
    }
    email = matches[0].email;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email ou palavra-passe incorretos." };

  // A suspended/fraud-flagged account never gets to know it was detected —
  // this deliberately looks identical to "this account doesn't exist"
  // rather than confirming the suspension (see suspendUser()/
  // markUserAsFraud() in lib/actions/admin.ts, which never notify either).
  const { data: profile } = await supabase.from("profiles").select("suspended_at").eq("id", data.user.id).single();
  if (profile?.suspended_at) {
    await supabase.auth.signOut();
    return { error: "Esta conta não existe." };
  }

  redirect(next);
}

export async function signOut(formData?: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const next = formData ? String(formData.get("next") ?? "/login") : "/login";
  redirect(next);
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Indique o seu email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return {};
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "A palavra-passe deve ter pelo menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  if (newPassword.length < 6) {
    return { error: "A nova palavra-passe deve ter pelo menos 6 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão expirada." };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) return { error: "Senha atual incorreta." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return {};
}
