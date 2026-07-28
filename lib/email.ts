import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Best-effort transactional email — a failure here must never break the
// caller's flow (a webhook crediting a sale, an admin approving a product),
// so every call site should treat this as fire-and-forget. Every attempt is
// logged to the `logs` table (action: "email_debug") — since Resend swallows
// nothing for us, this is the only way to confirm a send actually happened
// without needing the Resend dashboard.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const supabase = createAdminClient();

  if (!resend) {
    await supabase.from("logs").insert({
      action: "email_debug",
      metadata: { skipped: true, reason: "no RESEND_API_KEY", to, subject },
    });
    return;
  }

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "PagaJá <onboarding@resend.dev>",
      to,
      subject,
      html,
      ...(process.env.RESEND_REPLY_TO_EMAIL ? { replyTo: process.env.RESEND_REPLY_TO_EMAIL } : {}),
    });
    await supabase.from("logs").insert({
      action: "email_debug",
      metadata: { to, subject, ok: !result.error, id: result.data?.id ?? null, error: result.error ?? null },
    });
  } catch (err) {
    await supabase.from("logs").insert({
      action: "email_debug",
      metadata: { to, subject, error: (err as Error).message },
    });
  }
}

export function siteUrl(): string {
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

function emailButton(text: string, url: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td align="center">
          <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#2563EB 0%,#7C3AED 100%);color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:13px 28px;border-radius:10px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function emailBannerCard(input: { bannerColor: string; icon: string; title: string; bodyHtml: string }): string {
  const url = siteUrl();
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
            <tr>
              <td align="center" style="background:${input.bannerColor};padding:36px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,0.2);text-align:center;vertical-align:middle;font-size:24px;line-height:52px;">
                      ${input.icon}
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0;font-size:20px;font-weight:800;color:#ffffff;">${input.title}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                ${input.bodyHtml}
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

function emailReasonBox(label: string, text: string): string {
  return `
    <div style="background:#FEF2F2;border-left:3px solid #DC2626;border-radius:8px;padding:14px 16px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#DC2626;">${label}</p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:#7f1d1d;">${text}</p>
    </div>
  `;
}

function emailInfoBox(rows: { label: string; value: string; emphasize?: boolean }[]): string {
  const rowsHtml = rows
    .map(
      (r, i) => `
        <tr>
          <td style="padding:${i === 0 ? "0" : "12px"} 0 0;">
            <p style="margin:0;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#9ca3af;">${r.label}</p>
            <p style="margin:2px 0 0;font-size:${r.emphasize ? "18" : "15"}px;font-weight:700;color:${r.emphasize ? "#059669" : "#111827"};">${r.value}</p>
          </td>
        </tr>
      `
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;padding:16px 18px;margin:16px 0;">
      ${rowsHtml}
    </table>
  `;
}

export async function sendPaymentFailedEmail(input: {
  producerEmail: string;
  producerName?: string;
  buyerName: string;
  productTitle: string;
  amount: number;
  currency: string;
}) {
  await sendEmail({
    to: input.producerEmail,
    subject: `Pagamento não concluído — ${input.productTitle}`,
    html: emailBannerCard({
      bannerColor: "#DC2626",
      icon: "⚠️",
      title: "Pagamento não concluído",
      bodyHtml:
        emailParagraph(
          `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! <strong>${input.buyerName}</strong> tentou comprar o seu produto <strong>${input.productTitle}</strong>, no valor de <strong>${input.amount} ${input.currency}</strong>, mas o pagamento deu erro e não foi concluído.`
        ) +
        emailInfoBox([
          { label: "Cliente", value: input.buyerName },
          { label: "Produto", value: input.productTitle },
          { label: "Valor", value: `${input.amount} ${input.currency}` },
        ]) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Isto pode acontecer por saldo insuficiente, cancelamento no telemóvel do cliente, ou uma falha temporária do processador de pagamento. O cliente pode tentar novamente a qualquer momento — não precisa de fazer nada.</span>`
        ),
    }),
  });
}

export async function sendRefundNotificationEmail(input: {
  producerEmail: string;
  producerName?: string;
  buyerName: string;
  productTitle: string;
  amount: number;
  currency: string;
  newBalance: number;
}) {
  await sendEmail({
    to: input.producerEmail,
    subject: `Venda reembolsada/estornada — ${input.productTitle}`,
    html: emailBannerCard({
      bannerColor: "#DC2626",
      icon: "↩️",
      title: "Venda reembolsada",
      bodyHtml:
        emailParagraph(
          `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! A venda de <strong>${input.productTitle}</strong> para <strong>${input.buyerName}</strong>, no valor de <strong>${input.amount} ${input.currency}</strong>, foi reembolsada ou estornada pelo processador de pagamento.`
        ) +
        emailInfoBox([
          { label: "Cliente", value: input.buyerName },
          { label: "Produto", value: input.productTitle },
          { label: "Valor reembolsado", value: `${input.amount} ${input.currency}` },
          { label: "Novo saldo disponível", value: `${input.newBalance} ${input.currency}`, emphasize: true },
        ]) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">O valor desta venda foi descontado do seu saldo disponível porque já não foi efetivamente recebido pela PagaJá. Se já tinha levantado este valor, o seu saldo pode ficar negativo até à próxima venda.</span>`
        ),
    }),
  });
}

export async function sendEmployeeWelcomeEmail(input: {
  email: string;
  name: string;
  tempPassword: string;
  referralLink: string;
}) {
  const loginUrl = `${siteUrl()}/colaborador/login`;
  await sendEmail({
    to: input.email,
    subject: "Bem-vindo à equipa PagaJá — a sua conta de colaborador",
    html: emailBannerCard({
      bannerColor: "#2563EB",
      icon: "🤝",
      title: "Bem-vindo à equipa PagaJá",
      bodyHtml:
        emailParagraph(
          `Olá, <strong>${input.name}</strong>! Foi criada uma conta de colaborador para si na PagaJá. Vai ganhar comissão sobre as vendas dos produtores que recrutar através do seu link único.`
        ) +
        emailInfoBox([
          { label: "Email", value: input.email },
          { label: "Palavra-passe temporária", value: input.tempPassword, emphasize: true },
        ]) +
        emailParagraph(
          `O seu link único de recrutamento (partilhe com futuros produtores):<br/><a href="${input.referralLink}">${input.referralLink}</a>`
        ) +
        emailButton("Entrar na Área de Colaboradores", loginUrl) +
        emailParagraph(
          `É obrigatório seguir as redes sociais oficiais da PagaJá:<br/><a href="https://www.instagram.com/pagaja.co.mz">Instagram</a> · <a href="https://www.tiktok.com/@pagaja.site">TikTok</a>`
        ) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Recomendamos que troque a palavra-passe assim que entrar pela primeira vez.</span>`
        ),
    }),
  });
}

export async function sendSaleNotificationEmail(input: {
  producerEmail: string;
  productTitle: string;
  amount: number;
  netAmount: number;
  currency: string;
}) {
  await sendEmail({
    to: input.producerEmail,
    subject: "Nova venda na PagaJá! 🎉",
    html: emailShell(
      "Parabéns, você tem uma nova venda!",
      emailParagraph(`Acabou de vender <strong>${input.productTitle}</strong> na PagaJá.`) +
        emailInfoBox([
          { label: "Produto", value: input.productTitle },
          { label: "Valor bruto", value: `${input.amount} ${input.currency}` },
          { label: "Lucro líquido (após taxas)", value: `${input.netAmount} ${input.currency}`, emphasize: true },
        ]) +
        emailButton("Ver Detalhes da Venda", `${siteUrl()}/dashboard/orders`) +
        emailHighlight("Cada venda é uma prova de que o seu conteúdo está a gerar valor real.")
    ),
  });
}

export async function sendWithdrawalRequestedEmail(input: {
  producerEmail: string;
  producerName?: string;
  amount: number;
  netAmount: number;
  currency: string;
  payoutMethod: string;
  destination: string;
  instant: boolean;
}) {
  const methodLabel: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola", mkesh: "mKesh", bank_transfer: "Transferência bancária" };
  await sendEmail({
    to: input.producerEmail,
    subject: input.instant ? "Levantamento pago instantaneamente! ⚡" : "Levantamento pedido — a aguardar processamento",
    html: emailBannerCard({
      bannerColor: input.instant ? "#059669" : "#2563EB",
      icon: input.instant ? "⚡" : "🕒",
      title: input.instant ? "Levantamento pago!" : "Levantamento pedido",
      bodyHtml:
        emailParagraph(
          input.instant
            ? `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! O seu levantamento foi processado e pago instantaneamente.`
            : `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! Recebemos o seu pedido de levantamento — está a aguardar processamento.`
        ) +
        emailInfoBox([
          { label: "Valor bruto", value: `${input.amount} ${input.currency}` },
          { label: "Valor líquido", value: `${input.netAmount} ${input.currency}`, emphasize: true },
          { label: "Método", value: methodLabel[input.payoutMethod] ?? input.payoutMethod },
          { label: "Destino", value: input.destination },
        ]) +
        emailButton("Ver Levantamentos", `${siteUrl()}/dashboard/withdrawals`) +
        (input.instant
          ? emailParagraph(
              `<span style="color:#9ca3af;font-size:12px;">O dinheiro já deve estar disponível na sua conta de ${methodLabel[input.payoutMethod] ?? input.payoutMethod}.</span>`
            )
          : emailParagraph(
              `<span style="color:#9ca3af;font-size:12px;">Vamos avisá-lo assim que o pagamento for concluído.</span>`
            )),
    }),
  });
}

export async function sendBuyerReceiptEmail(input: { buyerEmail: string; productTitle: string; accessUrl: string }) {
  await sendEmail({
    to: input.buyerEmail,
    subject: `Pagamento confirmado — ${input.productTitle}`,
    html: emailShell(
      "Pagamento confirmado ✅",
      emailParagraph("Olá! O seu pagamento foi confirmado com sucesso.") +
        emailInfoBox([{ label: "Produto", value: input.productTitle }]) +
        emailButton("Aceder ao Conteúdo", input.accessUrl) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Este email foi enviado automaticamente pela plataforma PagaJá. Caso tenha dúvidas, entre em contacto com o vendedor.</span>`
        )
    ),
  });
}

export async function sendAdminMessageEmail(input: { to: string; subject: string; message: string }) {
  await sendEmail({
    to: input.to,
    subject: input.subject,
    html: emailShell(
      input.subject,
      input.message
        .split("\n\n")
        .map((paragraph) => emailParagraph(paragraph.replace(/\n/g, "<br/>")))
        .join("") +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Esta é uma mensagem privada enviada pela equipa PagaJá diretamente para a sua conta.</span>`
        )
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

export async function sendProductApprovedEmail(input: {
  producerEmail: string;
  producerName?: string;
  productTitle: string;
  productSlug: string;
}) {
  await sendEmail({
    to: input.producerEmail,
    subject: "O seu produto foi aprovado! 🎉",
    html: emailBannerCard({
      bannerColor: "#059669",
      icon: "✅",
      title: "Produto aprovado 🎉",
      bodyHtml:
        emailParagraph(
          `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! O seu produto foi revisto e aprovado — já está disponível para venda na PagaJá.`
        ) +
        emailInfoBox([{ label: "Produto aprovado", value: input.productTitle }]) +
        emailButton("Ver Produto", `${siteUrl()}/p/${input.productSlug}`) +
        emailHighlight("Um bom produto merece chegar a quem precisa dele. Boa sorte com as vendas!"),
    }),
  });
}

export async function sendProductDeletedEmail(input: {
  producerEmail: string;
  producerName?: string;
  productTitle: string;
}) {
  await sendEmail({
    to: input.producerEmail,
    subject: `O seu produto foi removido — ${input.productTitle}`,
    html: emailBannerCard({
      bannerColor: "#DC2626",
      icon: "🗑️",
      title: "Produto removido",
      bodyHtml:
        emailParagraph(
          `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! O seu produto foi removido da PagaJá pela nossa equipa e já não está disponível para venda.`
        ) +
        emailInfoBox([{ label: "Produto removido", value: input.productTitle }]) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Se considera que isto foi um engano, entre em contacto com o suporte da PagaJá.</span>`
        ),
    }),
  });
}

export async function sendProductRejectedEmail(input: {
  producerEmail: string;
  producerName?: string;
  productTitle: string;
  reason: string;
}) {
  await sendEmail({
    to: input.producerEmail,
    subject: `O seu produto não foi aprovado — ${input.productTitle}`,
    html: emailBannerCard({
      bannerColor: "#DC2626",
      icon: "⚠️",
      title: "Produto rejeitado",
      bodyHtml:
        emailParagraph(
          `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! O seu produto foi analisado e não foi aprovado para venda na PagaJá.`
        ) +
        emailInfoBox([{ label: "Produto rejeitado", value: input.productTitle }]) +
        emailReasonBox("Motivo da rejeição", input.reason || "Não especificado.") +
        emailParagraph("Pode corrigir o produto e submetê-lo novamente para revisão a qualquer momento.") +
        emailButton("Editar Produto", `${siteUrl()}/dashboard/products`),
    }),
  });
}
