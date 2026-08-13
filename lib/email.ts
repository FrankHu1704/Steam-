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
      from: process.env.RESEND_FROM_EMAIL || "PayNow <onboarding@resend.dev>",
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
                      Pay<span style="color:#7C3AED;">Now</span>
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
                  <a href="${url}" style="color:#9ca3af;text-decoration:none;">PayNow</a> ·
                  <a href="${url}/privacidade" style="color:#9ca3af;text-decoration:none;">Privacidade</a> ·
                  <a href="${url}/termos" style="color:#9ca3af;text-decoration:none;">Termos</a>
                </p>
                <p style="font-size:12px;color:#9ca3af;margin:0;">Recebeu este email porque tem uma conta PayNow.</p>
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
                  <a href="${url}" style="color:#9ca3af;text-decoration:none;">PayNow</a> ·
                  <a href="${url}/privacidade" style="color:#9ca3af;text-decoration:none;">Privacidade</a> ·
                  <a href="${url}/termos" style="color:#9ca3af;text-decoration:none;">Termos</a>
                </p>
                <p style="font-size:12px;color:#9ca3af;margin:0;">Recebeu este email porque tem uma conta PayNow.</p>
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
          `<span style="color:#9ca3af;font-size:12px;">O valor desta venda foi descontado do seu saldo disponível porque já não foi efetivamente recebido pela PayNow. Se já tinha levantado este valor, o seu saldo pode ficar negativo até à próxima venda.</span>`
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
    subject: "Bem-vindo à equipa PayNow — a sua conta de colaborador",
    html: emailBannerCard({
      bannerColor: "#2563EB",
      icon: "🤝",
      title: "Bem-vindo à equipa PayNow",
      bodyHtml:
        emailParagraph(
          `Olá, <strong>${input.name}</strong>! Foi criada uma conta de colaborador para si na PayNow. Vai ganhar comissão sobre as vendas dos produtores que recrutar através do seu link único.`
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
          `É obrigatório seguir as redes sociais oficiais da PayNow:<br/><a href="https://www.instagram.com/pagaja.co.mz">Instagram</a> · <a href="https://www.tiktok.com/@pagaja.site">TikTok</a>`
        ) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Recomendamos que troque a palavra-passe assim que entrar pela primeira vez.</span>`
        ),
    }),
  });
}

export async function sendInstantWithdrawalAnnouncementEmail(input: { producerEmail: string; producerName: string }) {
  await sendEmail({
    to: input.producerEmail,
    subject: "🎉 Novidade: Saques instantâneos na PayNow!",
    html: emailBannerCard({
      bannerColor: "#2563EB",
      icon: "🎉",
      title: "Saques instantâneos na PayNow!",
      bodyHtml:
        emailParagraph(`Olá, <strong>${input.producerName}</strong>!`) +
        emailParagraph(
          `A partir de agora, os teus levantamentos são pagos automaticamente e na hora — sem esperar aprovação do admin. O dinheiro cai na tua conta M-Pesa/e-Mola em até 5 minutos.`
        ) +
        emailParagraph(`<strong>Queres testar? É simples:</strong>`) +
        emailParagraph(
          `1️⃣ Cria um produto de teste (ex: 20 MT)<br/>2️⃣ Compra o teu próprio produto<br/>3️⃣ Faz o levantamento e vê o dinheiro a cair na hora 🚀`
        ) +
        emailButton("Criar produto de teste", `${siteUrl()}/dashboard/products/new`) +
        emailParagraph(`Qualquer dúvida, fala connosco!`),
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
    subject: "Nova venda na PayNow! 🎉",
    html: emailShell(
      "Parabéns, você tem uma nova venda!",
      emailParagraph(`Acabou de vender <strong>${input.productTitle}</strong> na PayNow.`) +
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

export async function sendWithdrawalOtpEmail(input: { email: string; name?: string; code: string }) {
  await sendEmail({
    to: input.email,
    subject: `${input.code} é o seu código de confirmação — PayNow`,
    html: emailBannerCard({
      bannerColor: "#2563EB",
      icon: "🔐",
      title: "Confirme o seu levantamento",
      bodyHtml:
        emailParagraph(`Olá${input.name ? `, <strong>${input.name}</strong>` : ""}! Use o código abaixo para confirmar o seu pedido de levantamento.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
          <tr>
            <td align="center">
              <div style="display:inline-block;background:#EEF2FF;border-radius:12px;padding:16px 32px;">
                <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:12px;color:#2563EB;">${input.code}</span>
              </div>
            </td>
          </tr>
        </table>` +
        emailParagraph(`<span style="color:#9ca3af;font-size:12px;">Válido por 5 minutos. Se não pediu este levantamento, ignore este email.</span>`),
    }),
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
    subject: input.instant ? "Levantamento pago! ⚡" : "Levantamento pedido — a aguardar processamento",
    html: emailBannerCard({
      bannerColor: input.instant ? "#059669" : "#2563EB",
      icon: input.instant ? "⚡" : "🕒",
      title: input.instant ? "Levantamento pago!" : "Levantamento pedido",
      bodyHtml:
        emailParagraph(
          input.instant
            ? `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! O seu levantamento foi processado e pago com sucesso.`
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

export async function sendAdminWithdrawalRequestedEmail(input: {
  adminEmail: string;
  producerName: string;
  amount: number;
  netAmount: number;
  currency: string;
  payoutMethod: string;
  destination: string;
  instant: boolean;
}) {
  const methodLabel: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola", mkesh: "mKesh", bank_transfer: "Transferência bancária" };
  await sendEmail({
    to: input.adminEmail,
    subject: input.instant
      ? `Levantamento pago automaticamente — ${input.producerName}`
      : `Levantamento pendente de aprovação — ${input.producerName}`,
    html: emailBannerCard({
      bannerColor: input.instant ? "#059669" : "#D97706",
      icon: input.instant ? "⚡" : "🕒",
      title: input.instant ? "Levantamento pago via B2C" : "Levantamento a aguardar aprovação",
      bodyHtml:
        emailParagraph(
          input.instant
            ? `<strong>${input.producerName}</strong> pediu um levantamento e foi pago automaticamente via B2C.`
            : `<strong>${input.producerName}</strong> pediu um levantamento, mas o pagamento automático via B2C não foi possível — precisa da sua aprovação/pagamento manual.`
        ) +
        emailInfoBox([
          { label: "Produtor", value: input.producerName },
          { label: "Valor bruto", value: `${input.amount} ${input.currency}` },
          { label: "Valor líquido", value: `${input.netAmount} ${input.currency}`, emphasize: true },
          { label: "Método", value: methodLabel[input.payoutMethod] ?? input.payoutMethod },
          { label: "Destino", value: input.destination },
        ]) +
        emailButton("Ver Levantamentos", `${siteUrl()}/admin/withdrawals`),
    }),
  });
}

export async function sendBuyerReceiptEmail(input: {
  buyerEmail: string;
  productTitle: string;
  accessUrl: string;
  orderId: string;
  amount: number;
  currency: "MZN" | "ZAR";
  purchasedAt: string;
  supportName?: string | null;
  supportContact?: string | null;
}) {
  const money = `${input.amount.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${input.currency}`;
  const purchaseDateLabel = new Date(input.purchasedAt).toLocaleString("pt-MZ", {
    timeZone: "Africa/Maputo",
    dateStyle: "short",
    timeStyle: "short",
  });
  const supportLabel = input.supportName
    ? `${input.supportName}${input.supportContact ? ` — ${input.supportContact}` : ""}`
    : "Falar com o vendedor pelo painel PayNow";

  await sendEmail({
    to: input.buyerEmail,
    subject: `Compra confirmada — ${input.productTitle}`,
    html: emailShell(
      "Compra confirmada 🎉",
      emailParagraph(`Olá! A sua compra de <strong>"${input.productTitle}"</strong> foi confirmada.`) +
        emailInfoBox([
          { label: "ID do Pedido", value: input.orderId },
          { label: "Produto", value: input.productTitle },
          { label: "Valor Pago", value: money },
          { label: "Data da Compra", value: purchaseDateLabel },
          { label: "Suporte", value: supportLabel },
        ]) +
        emailButton("Aceder ao Conteúdo", input.accessUrl) +
        emailReasonBox(
          "Importante",
          "Guarde este email como comprovante da sua compra.<br/>O link de acesso é válido por tempo indeterminado.<br/>Em caso de dúvidas, contacte o suporte acima."
        ) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">A PayNow é apenas o sistema de pagamentos usado por ${input.supportName ?? "o vendedor"} para processar esta compra. Não somos donos nem responsáveis pelo produto ou serviço vendido — para dúvidas sobre o conteúdo, contacte diretamente o vendedor. Contacte a PayNow apenas para reclamações relacionadas com o pagamento, ou para reportar fraude.${input.supportContact ? `<br/>Contacto do vendedor: <strong>${input.supportContact}</strong>` : ""}</span>`
        ) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Este email foi enviado automaticamente pela plataforma PayNow.</span>`
        )
    ),
  });
}

function emailBreakdownTable(rows: { label: string; count?: number; total: string }[], emptyText: string): string {
  if (rows.length === 0) {
    return emailParagraph(`<span style="color:#9ca3af;font-size:13px;">${emptyText}</span>`);
  }
  const rowsHtml = rows
    .map(
      (r) => `
        <tr>
          <td style="padding:7px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${r.label}${r.count != null ? ` <span style="color:#9ca3af;">× ${r.count}</span>` : ""}</td>
          <td style="padding:7px 0;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">${r.total}</td>
        </tr>
      `
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${rowsHtml}</table>`;
}

export async function sendDailySalesReportEmail(input: {
  producerEmail: string;
  producerName: string;
  dateLabel: string;
  currency: "MZN" | "ZAR";
  salesCount: number;
  totalSold: number;
  commissions: number;
  sellerRevenue: number;
  totalWithdrawn: number;
  salesByProduct: { title: string; count: number; total: number }[];
  salesByMethod: { method: string; count: number; total: number }[];
  withdrawalsToday: { method: string; netAmount: number }[];
}) {
  const money = (n: number) => `${n.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${input.currency}`;

  await sendEmail({
    to: input.producerEmail,
    subject: `O seu relatório diário — ${input.dateLabel}`,
    html: emailShell(
      `Relatório de hoje, ${input.dateLabel}`,
      emailParagraph(`Olá, <strong>${input.producerName}</strong>! Aqui está o seu resumo de vendas e levantamentos de hoje.`) +
        emailInfoBox([
          { label: "Transações", value: String(input.salesCount) },
          { label: "Volume bruto", value: money(input.totalSold) },
          { label: "Comissões", value: money(input.commissions) },
          { label: "Líquido", value: money(input.sellerRevenue), emphasize: true },
          { label: "Levantamentos de hoje", value: money(input.totalWithdrawn) },
        ]) +
        `<p style="margin:20px 0 8px;font-size:13px;font-weight:700;color:#111827;">Vendas por produto</p>` +
        emailBreakdownTable(
          input.salesByProduct.map((p) => ({ label: p.title, count: p.count, total: money(p.total) })),
          "Não houve vendas neste período."
        ) +
        `<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111827;">Vendas por método</p>` +
        emailBreakdownTable(
          input.salesByMethod.map((m) => ({ label: m.method, count: m.count, total: money(m.total) })),
          "Não houve vendas neste período."
        ) +
        `<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111827;">Levantamentos de hoje</p>` +
        emailBreakdownTable(
          input.withdrawalsToday.map((w) => ({ label: w.method, total: money(w.netAmount) })),
          "Não houve levantamentos neste período."
        ) +
        emailButton("Ver Painel", `${siteUrl()}/dashboard`) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Recebe este relatório automaticamente todos os dias às 17h30, enquanto tiver uma conta de produtor ativa na PayNow.</span>`
        )
    ),
  });
}

export async function sendAdminDailySummaryEmail(input: {
  adminEmail: string;
  dateLabel: string;
  currency: "MZN" | "ZAR";
  transactionsCount: number;
  grossVolume: number;
  commissions: number;
  netToProducers: number;
}) {
  const money = (n: number) => `${n.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${input.currency}`;

  await sendEmail({
    to: input.adminEmail,
    subject: `Resumo diário da plataforma — ${input.dateLabel}`,
    html: emailShell(
      `Resumo de hoje, ${input.dateLabel}`,
      emailParagraph(`Resumo de toda a plataforma PayNow hoje.`) +
        emailInfoBox([
          { label: "Transações", value: String(input.transactionsCount) },
          { label: "Volume bruto", value: money(input.grossVolume) },
          { label: "Comissões (receita PayNow)", value: money(input.commissions), emphasize: true },
          { label: "Líquido pago aos produtores", value: money(input.netToProducers) },
        ]) +
        emailButton("Ver Painel Admin", `${siteUrl()}/admin`) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Recebe este resumo automaticamente todos os dias às 17h30, enquanto tiver uma conta de admin ativa na PayNow.</span>`
        )
    ),
  });
}

// Suspension/fraud-block itself is deliberately silent (no email) — see
// suspendUser()/markUserAsFraud() in lib/actions/admin.ts — so this is the
// only signal a reactivated account ever gets, letting them know login
// works again (it looked like "account doesn't exist" the whole time).
export async function sendAccountReinstatedEmail(input: { to: string; name?: string }) {
  await sendEmail({
    to: input.to,
    subject: "A sua conta PayNow foi reativada",
    html: emailBannerCard({
      bannerColor: "#059669",
      icon: "✅",
      title: "Conta reativada",
      bodyHtml:
        emailParagraph(
          `Olá${input.name ? `, <strong>${input.name}</strong>` : ""}. A sua conta na PayNow foi reativada — já pode iniciar sessão normalmente.`
        ) + emailButton("Iniciar Sessão", `${siteUrl()}/login`),
    }),
  });
}

// Sent by the inactivity-deletion cron (see
// app/api/cron/delete-inactive-producers/route.ts) right as the account
// is deleted — this one IS disclosed (unlike the fraud/suspend silence
// policy) since it's a stated onboarding policy, not a fraud
// investigation nothing should tip off.
export async function sendAccountDeletedInactivityEmail(input: { to: string; name?: string; reason: string }) {
  await sendEmail({
    to: input.to,
    subject: "A sua conta PayNow foi eliminada por inatividade",
    html: emailBannerCard({
      bannerColor: "#374151",
      icon: "🗑️",
      title: "Conta eliminada",
      bodyHtml:
        emailParagraph(
          `Olá${input.name ? `, <strong>${input.name}</strong>` : ""}. A sua conta de produtor na PayNow foi eliminada automaticamente por não cumprir a nossa política de atividade mínima.`
        ) +
        emailReasonBox("Motivo", input.reason) +
        emailParagraph(
          "Pode voltar a criar uma conta na PayNow a qualquer momento. Se acha que isto foi um engano, contacte o suporte: +258 84 931 1757."
        ),
    }),
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
          `<span style="color:#9ca3af;font-size:12px;">Esta é uma mensagem privada enviada pela equipa PayNow diretamente para a sua conta.</span>`
        )
    ),
  });
}

const BATCH_SIZE = 100; // Resend batch API limit per call

export async function sendBulkEmail(recipients: string[], subject: string, message: string): Promise<{ sent: number }> {
  if (!resend || recipients.length === 0) return { sent: 0 };

  const from = process.env.RESEND_FROM_EMAIL || "PayNow <onboarding@resend.dev>";
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
          `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! O seu produto foi revisto e aprovado — já está disponível para venda na PayNow.`
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
          `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! O seu produto foi removido da PayNow pela nossa equipa e já não está disponível para venda.`
        ) +
        emailInfoBox([{ label: "Produto removido", value: input.productTitle }]) +
        emailParagraph(
          `<span style="color:#9ca3af;font-size:12px;">Se considera que isto foi um engano, entre em contacto com o suporte da PayNow.</span>`
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
          `Olá${input.producerName ? `, <strong>${input.producerName}</strong>` : ""}! O seu produto foi analisado e não foi aprovado para venda na PayNow.`
        ) +
        emailInfoBox([{ label: "Produto rejeitado", value: input.productTitle }]) +
        emailReasonBox("Motivo da rejeição", input.reason || "Não especificado.") +
        emailParagraph("Pode corrigir o produto e submetê-lo novamente para revisão a qualquer momento.") +
        emailButton("Editar Produto", `${siteUrl()}/dashboard/products`),
    }),
  });
}
