require("dotenv").config();

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const https = require("https");
const qrcode = require("qrcode-terminal");
const { createClient } = require("@supabase/supabase-js");

// ============================================================
// CONFIG
// ============================================================
const SITE_URL = process.env.PAGAJA_SITE_URL || "https://pagaja.site";
const SESSION_DIR = "./sessions";
const MAX_HISTORY = 20;

const GROQ_API_KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "")
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k.length > 10);
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// Same table Admin → Assistente WhatsApp (in the PagaJá dashboard) reads
// from — see supabase/migrations/0035_whatsapp_bot.sql.
const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

if (!supabase) {
  console.warn(
    "⚠️  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados — as conversas não vão aparecer em Admin → Assistente WhatsApp."
  );
}
if (GROQ_API_KEYS.length === 0) {
  console.error("❌ Nenhuma GROQ_API_KEYS / GROQ_API_KEY configurada. Configure o .env antes de continuar.");
  process.exit(1);
}

const SYSTEM_PROMPT = `Você é o assistente virtual da PagaJá no WhatsApp — a plataforma moçambicana para vender e comprar produtos digitais (eBooks, cursos, mentorias, templates). Fale sempre em português, num tom simpático, directo e breve, como numa conversa normal de WhatsApp (máximo 120 palavras, sem markdown, sem ** nem #).

O que sabe sobre a PagaJá:
- Produtores criam uma conta grátis, publicam um produto digital, e recebem o pagamento automaticamente via M-Pesa, e-Mola, mKesh ou cartão Visa/Mastercard.
- Há taxa sobre cada venda e sobre cada levantamento — os valores exactos e actualizados estão em ${SITE_URL}/taxas.
- Site: ${SITE_URL} · Criar conta: ${SITE_URL}/signup · Entrar: ${SITE_URL}/login

Regras importantes:
- Nunca mencione nomes de tecnologias, modelos de IA ou fornecedores internos que a PagaJá usa por trás — fale sempre só como "o assistente da PagaJá".
- Não tem acesso aos dados de nenhuma conta específica (saldo, pedidos, vendas) — se perguntarem isso, diga que não consegue ver isso por aqui e oriente a pessoa a entrar no site.
- Se não souber responder com confiança, diga isso claramente em vez de inventar, e sugira falar com o suporte humano da PagaJá.
- Responda apenas em conversas privadas — nunca em grupos.`;

// ============================================================
// TELEFONE (mesma lógica de lib/phone.ts no site)
// ============================================================
function normalizePhone(phone) {
  const trimmed = phone.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("258") && trimmed.length > 9) return `+${trimmed}`;
  const digits = trimmed.replace(/^0+/, "");
  return `+258${digits}`;
}

function jidToPhone(jid) {
  return normalizePhone(jid.split("@")[0]);
}

// ============================================================
// SUPABASE — histórico de conversa
// ============================================================
async function loadHistory(phone) {
  if (!supabase) return [];
  const { data } = await supabase
    .from("whatsapp_bot_messages")
    .select("role, content")
    .eq("phone", phone)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY);
  return data || [];
}

async function saveMessage(phone, role, content) {
  if (!supabase) return;
  await supabase.from("whatsapp_bot_messages").insert({ phone, role, content });
}

// ============================================================
// GROQ — com rotação de chaves (mesmo esquema de lib/groq.ts)
// ============================================================
function callGroq(messages, keyIndex) {
  keyIndex = keyIndex || 0;
  if (keyIndex >= GROQ_API_KEYS.length) return Promise.reject(new Error("GROQ_ESGOTADO"));
  const apiKey = GROQ_API_KEYS[keyIndex];

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: GROQ_MODEL, max_tokens: 300, temperature: 0.5, messages });
    const req = https.request(
      {
        hostname: "api.groq.com",
        path: "/openai/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(raw);
            if (json.error) {
              const msg = json.error.message || "";
              if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
                resolve(callGroq(messages, keyIndex + 1));
                return;
              }
              reject(new Error(msg));
              return;
            }
            const text = json.choices?.[0]?.message?.content?.trim();
            if (!text) {
              reject(new Error("Resposta vazia da IA"));
              return;
            }
            resolve(text);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function responder(phone, mensagemUtilizador) {
  const historico = await loadHistory(phone);
  await saveMessage(phone, "user", mensagemUtilizador);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historico.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: mensagemUtilizador },
  ];

  let resposta;
  try {
    resposta = await callGroq(messages);
  } catch (e) {
    console.error("[ERRO IA]", e.message);
    resposta = "Não consegui responder agora. Tente novamente daqui a pouco, ou fale connosco no site.";
  }

  await saveMessage(phone, "assistant", resposta);
  return resposta;
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
async function handleMessage(sock, msg) {
  try {
    if (msg.key.fromMe) return;
    const jid = msg.key.remoteJid;
    if (!jid || jid.endsWith("@g.us")) return; // ignora grupos

    const texto =
      (msg.message &&
        (msg.message.conversation || (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text))) ||
      "";
    if (!texto.trim()) return;
    if (texto.length > 2000) return; // evita abuso/mensagens gigantes

    const phone = jidToPhone(jid);
    console.log("📨 " + phone + ": " + texto);

    await sock.sendPresenceUpdate("composing", jid);
    const resposta = await responder(phone, texto.trim());
    await sock.sendPresenceUpdate("paused", jid);
    await sock.sendMessage(jid, { text: resposta }, { quoted: msg });
    console.log("🤖 PagaJá: " + resposta.substring(0, 80));
  } catch (err) {
    console.error("[ERRO GERAL]", err.message);
  }
}

// ============================================================
// CONEXÃO (Baileys — QR code)
// ============================================================
async function conectar() {
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["PagaJá", "Chrome", "1.0"],
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📷 Escaneie este QR code no WhatsApp (Configurações → Aparelhos conectados → Conectar aparelho):\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const code = new Boom(lastDisconnect && lastDisconnect.error).output.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconectando em 5s...");
        setTimeout(conectar, 5000);
      } else {
        console.log("🔓 Sessão encerrada — apague a pasta 'sessions' e execute novamente para reconectar.");
        process.exit(0);
      }
    }
    if (connection === "open") {
      console.log("\n✅ Assistente PagaJá conectado e pronto no WhatsApp!\n");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) await handleMessage(sock, msg);
  });
}

conectar();
