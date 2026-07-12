// Basic Auth para as rotas /api/admin/* — protege dados de doadores (nome, e-mail,
// telefone) e estatísticas. Credenciais vêm de variáveis de ambiente no Vercel,
// nunca do código-fonte.

const crypto = require("crypto");

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // compara na mesma o buffer consigo próprio para não vazar o tempo pela diferença de tamanho
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdminAuth(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    res.status(500).json({ error: "Painel não configurado (faltam ADMIN_USER/ADMIN_PASSWORD)." });
    return false;
  }

  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin", charset="UTF-8"');
    res.status(401).send("Autenticação necessária.");
    return false;
  }

  let decoded;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch (e) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin", charset="UTF-8"');
    res.status(401).send("Autenticação inválida.");
    return false;
  }

  const sep = decoded.indexOf(":");
  const givenUser = sep >= 0 ? decoded.slice(0, sep) : decoded;
  const givenPass = sep >= 0 ? decoded.slice(sep + 1) : "";

  const okUser = timingSafeEqual(givenUser, expectedUser);
  const okPass = timingSafeEqual(givenPass, expectedPass);
  if (!okUser || !okPass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin", charset="UTF-8"');
    res.status(401).send("Credenciais inválidas.");
    return false;
  }
  return true;
}

module.exports = { requireAdminAuth };
