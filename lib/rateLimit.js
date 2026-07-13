// Rate limit simples baseado em contagem no Supabase (não há estado partilhado
// entre invocações de funções serverless, por isso não dá para usar memória local).
// Uso: const over = await isRateLimited("donations", ipHash, 60000, 10);

const { supabaseCount } = require("./supabaseRest");

async function isRateLimited(table, ipHashOrFilterColumn, windowMs, max, column) {
  const col = column || "ip_hash";
  if (!ipHashOrFilterColumn) return false; // sem hash de IP não há como aplicar o limite
  const since = new Date(Date.now() - windowMs).toISOString();
  try {
    const count = await supabaseCount(
      `${table}?${col}=eq.${encodeURIComponent(ipHashOrFilterColumn)}&created_at=gte.${encodeURIComponent(since)}`
    );
    return count >= max;
  } catch (e) {
    return false; // uma falha na verificação nunca deve bloquear o pedido
  }
}

module.exports = { isRateLimited };
