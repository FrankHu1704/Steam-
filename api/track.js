// Endpoint público e discreto: regista visitas e cliques em páginas conhecidas.
// Não guarda IP em bruto, não aceita paths/eventos fora da lista, e nunca lança
// erro visível ao utilizador (falhar aqui não pode quebrar a página).

const { supabaseRequest } = require("../lib/supabaseRest");
const { hashIp } = require("../lib/trackingHash");
const { isRateLimited } = require("../lib/rateLimit");

const ALLOWED_PATHS = ["/", "/index.html", "/doar", "/doar.html"];
const ALLOWED_EVENTS = ["pageview", "cta_click", "quiz_step"];

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 40; // eventos por IP (hash) por minuto

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "";
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "";
  const event = typeof body.event === "string" ? body.event.slice(0, 40) : "pageview";
  const label = typeof body.label === "string" ? body.label.slice(0, 80) : null;

  if (!ALLOWED_PATHS.includes(path) || !ALLOWED_EVENTS.includes(event)) {
    res.status(204).end();
    return;
  }

  const ipHash = hashIp(clientIp(req));

  if (await isRateLimited("page_events", ipHash, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    res.status(204).end();
    return;
  }

  try {
    await supabaseRequest("page_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        path,
        event,
        label,
        ip_hash: ipHash,
        user_agent: (req.headers["user-agent"] || "").slice(0, 200),
        referrer: (req.headers["referer"] || "").slice(0, 200),
      }),
    });
  } catch (e) {
    // silencioso de propósito — tracking nunca deve afectar a experiência do utilizador
  }

  res.status(204).end();
};
