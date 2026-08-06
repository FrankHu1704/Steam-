"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessage, deleteChatMessage } from "@/lib/actions/chat";
import type { CommunityChatMessage } from "@/types/database";

const ROLE_LABEL: Record<string, string> = { producer: "Produtor", buyer: "Comprador", admin: "Admin" };
const MAX_MESSAGE_LENGTH = 500;

export function CommunityChat({
  initialMessages,
  currentUserId,
  isAdmin,
}: {
  initialMessages: CommunityChatMessage[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("community-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_chat_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as CommunityChatMessage]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_chat_messages" },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || pending) return;
    setPending(true);
    setText("");
    const res = await sendChatMessage(value);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      setText(value);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar esta mensagem?")) return;
    const res = await deleteChatMessage(id);
    if (res.error) toast.error(res.error);
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Ainda não há mensagens. Seja o primeiro a dizer olá!
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === currentUserId;
            return (
              <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    mine ? "bg-brand-gradient text-white" : "bg-muted"
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-xs font-semibold opacity-80">
                      {m.user_name} · <span className="font-normal">{ROLE_LABEL[m.user_role] ?? m.user_role}</span>
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className={`text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className={`opacity-0 transition-opacity group-hover:opacity-100 ${
                          mine ? "text-white/80" : "text-muted-foreground"
                        }`}
                        title="Apagar mensagem"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem…"
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={pending}
        />
        <Button type="submit" size="icon" disabled={pending || !text.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
