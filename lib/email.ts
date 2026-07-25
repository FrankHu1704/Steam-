import { Resend } from "resend";

// Best-effort transactional email — a failure here must never break the
// caller's flow (a webhook crediting a sale, an admin approving a product),
// so every call site should treat this as fire-and-forget.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "PagaJá <onboarding@resend.dev>",
      to,
      subject,
      html,
      ...(process.env.RESEND_REPLY_TO_EMAIL ? { replyTo: process.env.RESEND_REPLY_TO_EMAIL } : {}),
    });
  } catch {
    // Non-fatal — the in-app notification already recorded the event.
  }
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://pagaja.vercel.app";
}

function emailShell(title: string, bodyHtml: string): string {
  const url = siteUrl();
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
            <tr>
              <td style="padding:32px 32px 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:36px;height:36px;border-radius:10px;background:#2563EB;text-align:center;vertical-align:middle;">
                      <span style="color:#ffffff;font-weight:700;font-size:18px;line-height:36px;">P</span>
                    </td>
                    <td style="padding-left:10px;font-size:18px;font-weight:700;color:#111827;">
                      Paga<span style="color:#7C3AED;">Já</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px;">
                <h1 style="font-size:19px;line-height:1.3;margin:0 0 14px;color:#111827;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 28px;">
                <div style="height:1px;background:#e5e7eb;margin:20px 0;"></div>
                <p style="font-size:12px;color:#9ca3af;margin:0 0 6px;">
                  <a href="${url}" style="color:#9ca3af;text-decoration:none;">PagaJá</a> ·
                  <a href="${url}/privacidade" style="color:#9ca3af;text-decoration:none;">Privacidade</a> ·
                  <a href="${url}/termos" style="color:#9ca3af;text-decoration:none;">Termos</a>
                </p>
                <p style="font-size:12px;color:#9ca3af;margin:0;">Recebeu este email porque tem uma conta PagaJá.</p>
                <p style="font-size:11px;color:#d1d5db;margin:14px 0 0;">by FRANK AI SOLUTIONS</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function emailParagraph(text: string): string {
  return `<p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 14px;">${text}</p>`;
}

function emailHighlight(text: string): string {
  return `
    <div style="background:#EEF2FF;border-left:3px solid #7C3AED;border-radius:8px;padding:14px 16px;margin:16px 0;">
      <p style="margin:0;font-size:14px;font-style:italic;color:#4338CA;">${text}</p>
    </div>
  `;
}

export async function sendSaleNotificationEmail(input: {
  producerEmail: string;
  productTitle: string;
  amount: number;
  currency: string;
}) {
  await sendEmail({
    to: input.producerEmail,
    subject: "Nova venda na PagaJá! 🎉",
    html: emailShell(
      "Você tem uma nova venda!",
      emailParagraph(
        `O produto <strong>${input.productTitle}</strong> acabou de ser vendido por <strong>${input.amount} ${input.currency}</strong>.`
      ) +
        emailParagraph("O valor já está disponível no seu saldo no painel da PagaJá.") +
        emailHighlight("Cada venda é uma prova de que o seu conteúdo está a gerar valor real.")
    ),
  });
}

const BATCH_SIZE = 100; // Resend batch API limit per call

export async function sendBulkEmail(recipients: string[], subject: string, message: string): Promise<{ sent: number }> {
  if (!resend || recipients.length === 0) return { sent: 0 };

  const from = process.env.RESEND_FROM_EMAIL || "PagaJá <onboarding@resend.dev>";
  const html = emailShell(
    subject,
    message
      .split("\n\n")
      .map((paragraph) => emailParagraph(paragraph.replace(/\n/g, "<br/>")))
      .join("")
  );

  let sent = 0;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    try {
      await resend.batch.send(
        chunk.map((to) => ({
          from,
          to,
          subject,
          html,
          ...(process.env.RESEND_REPLY_TO_EMAIL ? { replyTo: process.env.RESEND_REPLY_TO_EMAIL } : {}),
        }))
      );
      sent += chunk.length;
    } catch {
      // Continue with remaining chunks even if one batch fails.
    }
  }
  return { sent };
}

export async function sendProductApprovedEmail(input: { producerEmail: string; productTitle: string }) {
  await sendEmail({
    to: input.producerEmail,
    subject: "O seu produto foi aprovado! ✅",
    html: emailShell(
      "Produto aprovado",
      emailParagraph(
        `O seu produto <strong>${input.productTitle}</strong> foi revisto e aprovado. Já está disponível para venda na PagaJá.`
      ) + emailHighlight("Um bom produto merece chegar a quem precisa dele. Boa sorte com as vendas!")
    ),
  });
}
