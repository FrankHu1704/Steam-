"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMozambiquePhone } from "@/lib/phone";

export interface ActionResult {
  error?: string;
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const phoneRaw = String(formData.get("phone") ?? "").trim();

  if (!name || !email || !password || !phoneRaw) {
    return { error: "Preencha nome, email, telefone e palavra-passe." };
  }
  if (password.length < 6) {
    return { error: "A palavra-passe deve ter pelo menos 6 caracteres." };
  }
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 9) {
    return { error: "Indique um número de telemóvel válido." };
  }
  const phone = normalizeMozambiquePhone(phoneRaw);
  const referralCode = String(formData.get("ref") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  if (referralCode && data.user) {
    const admin = createAdminClient();
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

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

export async function resendVerificationEmail(email: string): Promise<ActionResult & { ok?: boolean }> {
  if (!email.trim()) return { error: "Indique o seu email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email ou palavra-passe incorretos." };

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
