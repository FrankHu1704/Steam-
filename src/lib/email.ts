const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

export function isEmailConfigured() {
  return Boolean(RESEND_API_KEY);
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  planName: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY não configurada — email não enviado.", params);
    return { skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Senga Host <${EMAIL_FROM}>`,
      to: [params.to],
      subject: "Bem-vindo à Senga Host — a sua hospedagem está ativa",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#0066FF;">Bem-vindo à Senga Host, ${params.name}!</h2>
          <p>O seu pagamento foi confirmado e o plano <strong>${params.planName}</strong> já está ativo.</p>
          <p>Em breve receberá as credenciais de acesso ao painel para enviar o ficheiro do seu bot.</p>
          <p style="color:#6b7280; font-size: 13px;">Dúvidas? Responda a este email ou fale connosco no WhatsApp.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[email] Falha ao enviar via Resend:", text);
    return { skipped: false, error: text };
  }

  return { skipped: false };
}
