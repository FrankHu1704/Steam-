// Notificação por e-mail via Resend (https://resend.com) quando uma doação
// passa a "success". Não usa SDK — só fetch, para não depender de package.json.
//
// Configuração necessária (env vars no Vercel):
//   RESEND_API_KEY   — chave da API do Resend
//   NOTIFY_EMAIL     — o teu e-mail, para onde a notificação é enviada
//   NOTIFY_FROM      — remetente verificado no Resend (ex: notificacoes@teudominio.com)
//
// Se qualquer uma destas faltar, a função não faz nada (silenciosamente) —
// nunca deve travar o fluxo de confirmação de pagamento.

async function notifyDonationSuccess(donation) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.NOTIFY_FROM;
  if (!apiKey || !to || !from) return;

  const amount = Number(donation.amount || 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2 });
  const subject = `Nova doação recebida — ${amount} MT`;
  const html = `
    <p>Recebeste uma nova doação no Frank AI Solutions.</p>
    <ul>
      <li><strong>Valor:</strong> ${amount} MT</li>
      <li><strong>Método:</strong> ${escapeHtml(donation.method || "—")}</li>
      <li><strong>Nome:</strong> ${escapeHtml(donation.donor_name || "—")}</li>
      <li><strong>E-mail:</strong> ${escapeHtml(donation.donor_email || "—")}</li>
      <li><strong>Referência:</strong> ${escapeHtml(donation.reference || donation.external_id || "—")}</li>
    </ul>
    <p>Vê mais detalhes no <a href="https://frank-perfil.vercel.app/admin">painel de admin</a>.</p>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch (e) {
    // nunca deixar uma falha de notificação quebrar a confirmação do pagamento
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

module.exports = { notifyDonationSuccess };
