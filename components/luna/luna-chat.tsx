"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askLuna, clearLunaHistory } from "@/lib/actions/luna";

interface ChatItem {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_QUICK_PROMPTS = [
  "Como aumentar as minhas vendas este mês?",
  "Como escalar anúncios no Facebook e Instagram?",
  "Dicas para o meu produto mais vendido",
  "Que preço devo cobrar pelos meus produtos?",
];

export function LunaChat({
  initialMessages,
  onSend = askLuna,
  onClear = clearLunaHistory,
  quickPrompts = DEFAULT_QUICK_PROMPTS,
  subtitle = "Dicas de vendas, marketing e como escalar anúncios.",
  emptyStateText = "Pergunte à LunaAI sobre como vender mais, escalar anúncios, ou definir preços.",
}: {
  initialMessages: ChatItem[];
  onSend?: (message: string) => Promise<{ reply?: string; error?: string }>;
  onClear?: () => Promise<{ ok?: boolean; error?: string }>;
  quickPrompts?: string[];
  subtitle?: string;
  emptyStateText?: string;
}) {
  const [messages, setMessages] = useState<ChatItem[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setPending(true);
    const res = await onSend(trimmed);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
    } else if (res.reply) {
      setMessages((m) => [...m, { role: "assistant", content: res.reply! }]);
    }
  }

  async function handleClear() {
    if (!confirm("Apagar todo o histórico de conversa com a LunaAI?")) return;
    await onClear();
    setMessages([]);
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[420px] flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold">LunaAI</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <p className="max-w-xs text-sm text-muted-foreground">{emptyStateText}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-gradient text-white"
                  : "border border-border bg-muted/40 text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> A pensar…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-border p-4"
      >
        <Textarea
          rows={1}
          placeholder="Pergunte alguma coisa à LunaAI…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          className="min-h-[44px] resize-none"
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
