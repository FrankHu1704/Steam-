"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, X, Send, Loader2, Phone, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { askSupportBot, getSupportBotHistory, clearSupportBotHistory, type SupportBotMessage } from "@/lib/actions/support-bot";

const SUPPORT_WHATSAPP = "https://wa.me/258849311757";

const QUICK_QUESTIONS = ["Qual é o meu saldo?", "Como faço um saque?", "Como publico um produto?", "Como funcionam as indicações?"];

export function SupportBubble() {
  const [open, setOpen] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const [messages, setMessages] = useState<SupportBotMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loadedHistory) return;
    setLoadedHistory(true);
    void getSupportBotHistory().then(setMessages);
  }, [open, loadedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    const res = await askSupportBot(trimmed);
    setSending(false);
    if (res.reply) {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply! }]);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", content: res.error ?? "Não consegui responder agora." }]);
    }
  }

  async function handleClear() {
    await clearSupportBotHistory();
    setMessages([]);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105"
        aria-label="Suporte PayNow"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between gap-2 bg-brand-gradient px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Suporte PayNow</p>
          <p className="text-xs text-white/80">Assistente IA · Online</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handleClear} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Limpar conversa">
            <Trash2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-xl bg-muted p-3 text-sm">
            Olá! Sou o assistente de suporte da PayNow. Se tiveres sessão iniciada, consigo ver o teu saldo e ajudar
            com saques, produtos e vendas. O que precisas?
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-sm",
              m.role === "user" ? "ml-auto bg-primary text-white" : "bg-muted"
            )}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> a escrever...
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <a
        href={SUPPORT_WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-4 mb-2 flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
      >
        <Phone className="h-3.5 w-3.5" /> Falar com suporte humano (WhatsApp)
      </a>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreve a tua pergunta..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
