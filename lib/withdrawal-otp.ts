import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithdrawalOtpEmail } from "@/lib/email";

const CODE_LENGTH = 4;
const EXPIRES_AFTER_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** "producer@example.com" -> "pr•••@example.com" — enough to recognize, not enough to leak. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}•••@${domain}`;
}

export async function sendWithdrawalOtp(
  userId: string,
  email: string | null,
  name?: string
): Promise<{ ok: true; emailMasked: string } | { ok: false; error: string; retryAfterSeconds?: number }> {
  if (!email) {
    return { ok: false, error: "A sua conta não tem um email registado." };
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
  if (error) {
    // Almost always means the withdrawal_otp_codes table/migration is
    // missing in this Supabase project — logged here so Admin -> Logs
    // shows the real Postgres error instead of just the generic message
    // below (what the producer sees has to stay non-technical).
    await supabase.from("logs").insert({
      action: "withdrawal_otp_generate_error",
      metadata: { user_id: userId, error: error.message, code: error.code },
    });
    return { ok: false, error: "Falha ao gerar o código. Tente novamente." };
  }

  await sendWithdrawalOtpEmail({ email, name, code });

  return { ok: true, emailMasked: maskEmail(email) };
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
