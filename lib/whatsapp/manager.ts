import path from "path";
import fs from "fs";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState as loadMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { prisma } from "@/lib/db";
import { buildSystemPrompt, appendSignature } from "@/lib/identity";
import { chamarGroq, type ChatMessage } from "@/lib/groq";

const SESSIONS_ROOT = path.join(process.cwd(), "sessions");

type AgentConnection = {
  sock: WASocket;
  status: "pairing" | "connected" | "disconnected";
  pairingCode?: string;
  history: Map<string, ChatMessage[]>;
};

type ManagerState = { connections: Map<string, AgentConnection> };

const globalForWa = globalThis as unknown as { __waManager?: ManagerState };
const state: ManagerState = globalForWa.__waManager ?? { connections: new Map() };
if (process.env.NODE_ENV !== "production") globalForWa.__waManager = state;

function sessionDir(agentId: string) {
  return path.join(SESSIONS_ROOT, agentId);
}

export function getRuntimeStatus(agentId: string) {
  const conn = state.connections.get(agentId);
  if (!conn) return null;
  return { status: conn.status, pairingCode: conn.pairingCode };
}

async function handleIncomingMessage(agentId: string, jid: string, texto: string) {
  const conn = state.connections.get(agentId);
  if (!conn) return;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { trainingEntries: true },
  });
  if (!agent) return;

  if (!conn.history.has(jid)) conn.history.set(jid, []);
  const hist = conn.history.get(jid)!;
  hist.push({ role: "user", content: texto });
  while (hist.length > 20) hist.shift();

  const systemPrompt = buildSystemPrompt(agent, agent.trainingEntries);
  let resposta: string;
  try {
    resposta = await chamarGroq([{ role: "system", content: systemPrompt }, ...hist]);
  } catch {
    resposta = "Desculpa, os serviços de IA estão temporariamente indisponíveis. Tenta novamente daqui a pouco.";
  }
  resposta = appendSignature(resposta);
  hist.push({ role: "assistant", content: resposta });

  await conn.sock.sendMessage(jid, { text: resposta });
}

export async function connectAgent(agentId: string, phoneNumber: string): Promise<{ pairingCode: string }> {
  const existing = state.connections.get(agentId);
  if (existing) {
    try {
      existing.sock.end(undefined);
    } catch {
      /* ignore */
    }
    state.connections.delete(agentId);
  }

  fs.mkdirSync(sessionDir(agentId), { recursive: true });
  const { state: authState, saveCreds } = await loadMultiFileAuthState(sessionDir(agentId));
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: authState,
    logger: pino({ level: "silent" }),
    browser: ["FRANK AI SOLUTIONS", "Chrome", "1.0.0"],
  });

  const conn: AgentConnection = { sock, status: "pairing", history: new Map() };
  state.connections.set(agentId, conn);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      conn.status = "connected";
      conn.pairingCode = undefined;
      await prisma.agent.update({ where: { id: agentId }, data: { status: "connected", pairingCode: null } });
    }
    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      state.connections.delete(agentId);
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: "disconnected", pairingCode: null },
      });
      if (loggedOut) {
        fs.rmSync(sessionDir(agentId), { recursive: true, force: true });
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") continue;
      const texto =
        msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
      if (!texto.trim()) continue;
      handleIncomingMessage(agentId, jid, texto).catch((err) =>
        console.error("[LunaAI handler]", err)
      );
    }
  });

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ""));
    conn.pairingCode = code;
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "pairing", pairingCode: code, phoneNumber },
    });
    return { pairingCode: code };
  }

  return { pairingCode: "" };
}

export async function disconnectAgent(agentId: string): Promise<void> {
  const conn = state.connections.get(agentId);
  if (conn) {
    try {
      await conn.sock.logout();
    } catch {
      /* ignore */
    }
    state.connections.delete(agentId);
  }
  fs.rmSync(sessionDir(agentId), { recursive: true, force: true });
  await prisma.agent.update({ where: { id: agentId }, data: { status: "disconnected", pairingCode: null } });
}
