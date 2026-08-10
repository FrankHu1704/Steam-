import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithdrawalOtpSms } from "@/lib/easyhost-sms";

const CODE_LENGTH = 4;
const EXPIRES_AFTER_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** "+258849311757" -> "84•••757" — enough to recognize, not enough to leak. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-9);
  if (digits.length < 6) return "•••";
  return `${digits.slice(0, 2)}•••${digits.slice(-3)}`;
}

export async function sendWithdrawalOtp(
  userId: string,
  phone: string | null
): Promise<{ ok: true; phoneMasked: string } | { ok: false; error: string; retryAfterSeconds?: number }> {
  if (!phone) {
    return { ok: false, error: "A sua conta não tem um número de telemóvel registado. Atualize-o em Definições." };
  }

  const supabase = createAdminClient();

  const { data: lastCode } = await supabase
    .from("withdrawal_otp_codes")
    .select("created_at")
    .eq("user_id", userId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastCode) {
    const elapsedMs = Date.now() - new Date(lastCode.created_at).getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        error: "Já enviámos um código — aguarde antes de pedir outro.",
        retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000),
      };
    }
  }

  // A fresh code invalidates any still-unexpired earlier one for this user.
  await supabase.from("withdrawal_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("user_id", userId).is("consumed_at", null);

  const code = generateCode();
  const { error } = await supabase.from("withdrawal_otp_codes").insert({
    user_id: userId,
    code,
    expires_at: new Date(Date.now() + EXPIRES_AFTER_MS).toISOString(),
  });
  if (error) return { ok: false, error: "Falha ao gerar o código. Tente novamente." };

  await sendWithdrawalOtpSms({ phone, code });

  return { ok: true, phoneMasked: maskPhone(phone) };
}

export async function verifyAndConsumeWithdrawalOtp(
  userId: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  const { data: pending } = await supabase
    .from("withdrawal_otp_codes")
    .select("id, code, attempts, expires_at")
    .eq("user_id", userId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) return { ok: false, error: "Pedido de código expirado. Peça um novo código." };
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await supabase.from("withdrawal_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", pending.id);
    return { ok: false, error: "O código expirou. Peça um novo código." };
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    await supabase.from("withdrawal_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", pending.id);
    return { ok: false, error: "Demasiadas tentativas. Peça um novo código." };
  }

  if (pending.code !== code.trim()) {
    await supabase.from("withdrawal_otp_codes").update({ attempts: pending.attempts + 1 }).eq("id", pending.id);
    const remaining = MAX_ATTEMPTS - (pending.attempts + 1);
    return { ok: false, error: remaining > 0 ? `Código incorreto. Restam ${remaining} tentativas.` : "Código incorreto. Peça um novo código." };
  }

  await supabase.from("withdrawal_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", pending.id);
  return { ok: true };
}
