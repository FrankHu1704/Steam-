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

function emailShell(title: string, bodyHtml: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <p style="font-size:20px;font-weight:bold;margin:0 0 24px;">
        Paga<span style="color:#7C3AED;">Já</span>
      </p>
      <h1 style="font-size:18px;margin:0 0 12px;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#6b7280;">
        by FRANK AI SOLUTIONS
      </p>
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
      `
        <p style="font-size:14px;color:#374151;">
          O produto <strong>${input.productTitle}</strong> acabou de ser vendido por
          <strong>${input.amount} ${input.currency}</strong>.
        </p>
        <p style="font-size:14px;color:#374151;">
          O valor já está disponível no seu saldo no painel da PagaJá.
        </p>
      `
    ),
  });
}

const BATCH_SIZE = 100; // Resend batch API limit per call

export async function sendBulkEmail(recipients: string[], subject: string, message: string): Promise<{ sent: number }> {
  if (!resend || recipients.length === 0) return { sent: 0 };

  const from = process.env.RESEND_FROM_EMAIL || "PagaJá <onboarding@resend.dev>";
  const html = emailShell(subject, `<p style="font-size:14px;color:#374151;white-space:pre-line;">${message}</p>`);

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
      `
        <p style="font-size:14px;color:#374151;">
          O seu produto <strong>${input.productTitle}</strong> foi revisto e aprovado.
          Já está disponível para venda na PagaJá.
        </p>
      `
    ),
  });
}
