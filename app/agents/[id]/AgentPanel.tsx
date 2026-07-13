"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type TrainingEntry = { id: string; question: string; answer: string };
type Agent = {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: string;
  pairingCode: string | null;
  customInstructions: string;
  trainingEntries: TrainingEntry[];
};

const TABS = ["conectar", "treino", "testar"] as const;
type Tab = (typeof TABS)[number];

const STATUS_LABEL: Record<string, string> = {
  connected: "🟢 Ligado",
  pairing: "🟡 A parear",
  disconnected: "🔴 Desligado",
};

export default function AgentPanel({ agent: initialAgent }: { agent: Agent }) {
  const [tab, setTab] = useState<Tab>("conectar");
  const [agent, setAgent] = useState(initialAgent);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-emerald-100/50 hover:text-accent">
            ← Painel
          </Link>
          <h1 className="text-2xl font-semibold">{agent.name}</h1>
        </div>
        <span className="text-sm">{STATUS_LABEL[agent.status] ?? agent.status}</span>
      </div>

      <div className="mb-6 flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${
              tab === t
                ? "border-b-2 border-accent text-accent"
                : "text-emerald-100/60 hover:text-emerald-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "conectar" && <ConnectTab agent={agent} onAgentChange={setAgent} />}
      {tab === "treino" && <TrainTab agent={agent} onAgentChange={setAgent} />}
      {tab === "testar" && <TestTab agent={agent} />}
    </div>
  );
}

function ConnectTab({
  agent,
  onAgentChange,
}: {
  agent: Agent;
  onAgentChange: (a: Agent) => void;
}) {
  const [phoneNumber, setPhoneNumber] = useState(agent.phoneNumber ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (agent.status !== "pairing") return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/agents/${agent.id}/status`);
      if (!res.ok) return;
      const data = await res.json();
      onAgentChange({ ...agent, status: data.status, pairingCode: data.pairingCode });
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.status]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/agents/${agent.id}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erro ao ligar.");
      return;
    }
    onAgentChange({ ...agent, status: "pairing", pairingCode: data.pairingCode, phoneNumber });
  }

  async function handleDisconnect() {
    setLoading(true);
    await fetch(`/api/agents/${agent.id}/disconnect`, { method: "POST" });
    setLoading(false);
    onAgentChange({ ...agent, status: "disconnected", pairingCode: null });
  }

  if (agent.status === "connected") {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="mb-4">
          ✅ Ligado a <span className="font-medium">+{agent.phoneNumber}</span>
        </p>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="rounded-md border border-border px-4 py-2 text-sm hover:border-red-400 hover:text-red-400 disabled:opacity-50"
        >
          {loading ? "A desligar..." : "Desligar número"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {agent.status === "pairing" && agent.pairingCode ? (
        <div className="mb-6 rounded-md border border-accent/40 bg-accent/10 p-4 text-center">
          <p className="mb-2 text-sm text-emerald-100/70">Código de pareamento</p>
          <p className="text-3xl font-mono font-semibold tracking-widest text-accent">
            {agent.pairingCode}
          </p>
          <p className="mt-3 text-xs text-emerald-100/60">
            WhatsApp → Configurações → Dispositivos ligados → Ligar dispositivo → Ligar com número
            de telefone
          </p>
        </div>
      ) : null}

      <form onSubmit={handleConnect} className="flex flex-col gap-3">
        <label className="text-sm text-emerald-100/70">
          Número de WhatsApp (com código do país, ex: 258849311757)
        </label>
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
          className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          placeholder="258849311757"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "A gerar código..." : "Gerar código de pareamento"}
        </button>
      </form>
    </div>
  );
}

function TrainTab({
  agent,
  onAgentChange,
}: {
  agent: Agent;
  onAgentChange: (a: Agent) => void;
}) {
  const [instructions, setInstructions] = useState(agent.customInstructions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);

  async function handleSaveInstructions() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/agents/${agent.id}/train`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customInstructions: instructions }),
    });
    setSaving(false);
    setSaved(true);
    onAgentChange({ ...agent, customInstructions: instructions });
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setAddingEntry(true);
    await fetch(`/api/agents/${agent.id}/train`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addEntry: { question, answer } }),
    });
    setAddingEntry(false);
    onAgentChange({
      ...agent,
      trainingEntries: [{ id: crypto.randomUUID(), question, answer }, ...agent.trainingEntries],
    });
    setQuestion("");
    setAnswer("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-1 font-medium">Comportamento e conhecimento</h2>
        <p className="mb-3 text-sm text-emerald-100/60">
          Define o tom de voz, o teu negócio e como o agente deve agir. A identidade LunaAI / FRANK
          AI SOLUTIONS é sempre adicionada por cima disto e não pode ser removida.
        </p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={8}
          className="mb-3 w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-accent"
          placeholder="Ex: Atende clientes da Loja X, responde sobre preços e horários, tom simpático e directo..."
        />
        <button
          onClick={handleSaveInstructions}
          disabled={saving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "A guardar..." : "Guardar treino"}
        </button>
        {saved && <span className="ml-3 text-sm text-accent">Guardado ✓</span>}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-3 font-medium">Perguntas e respostas específicas</h2>
        <form onSubmit={handleAddEntry} className="mb-4 flex flex-col gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pergunta (ex: Qual é o horário de funcionamento?)"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={2}
            placeholder="Resposta que o agente deve dar"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={addingEntry}
            className="self-start rounded-md border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
          >
            + Adicionar ao treino
          </button>
        </form>

        {agent.trainingEntries.length === 0 ? (
          <p className="text-sm text-emerald-100/50">Ainda sem perguntas ensinadas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {agent.trainingEntries.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium text-emerald-100/90">P: {entry.question}</p>
                <p className="text-emerald-100/60">R: {entry.answer}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TestTab({ agent }: { agent: Agent }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/agents/${agent.id}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erro ao testar agente.");
      return;
    }
    setMessages([...next, { role: "assistant", content: data.reply }]);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="mb-4 text-sm text-emerald-100/60">
        Conversa de teste — não é enviada por WhatsApp, usa o mesmo treino e identidade.
      </p>
      <div className="mb-4 flex max-h-96 flex-col gap-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-md p-3 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "self-end bg-accent text-black"
                : "self-start border border-border bg-background"
            }`}
          >
            {m.content}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-emerald-100/40">Escreve uma mensagem para começar.</p>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Escreve como se fosses um cliente..."
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
