const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

export function isEmailConfigured() {
  return Boolean(RESEND_API_KEY);
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  planName: string;
  loginLink: string | null;
}) {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY não configurada — email não enviado.", params);
    return { skipped: true };
  }

  const accessSection = params.loginLink
    ? `<p style="text-align:center; margin: 24px 0;">
         <a href="${params.loginLink}" style="background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
           Aceder ao meu painel
         </a>
       </p>
       <p style="color:#6b7280; font-size: 12px;">Este link expira em breve. Depois de entrar, pode definir uma palavra-passe em Configurações.</p>`
    : `<p>Aceda ao painel em <a href="https://sengahost.com/painel/login">sengahost.com/painel</a> com o email usado na compra para configurar o acesso.</p>`;

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
          ${accessSection}
          <p>No painel pode enviar o ficheiro do seu bot e acompanhar o estado da sua conta.</p>
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
