"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Trash2, Loader2, MessagesSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessage, deleteChatMessage } from "@/lib/actions/chat";
import { LUNA_CHAT_NAME } from "@/lib/groq";
import { cn } from "@/lib/utils";
import type { CommunityChatMessage } from "@/types/database";

const ROLE_LABEL: Record<string, string> = { producer: "Produtor", buyer: "Comprador", admin: "Admin", bot: "IA" };
const MAX_MESSAGE_LENGTH = 500;
// Grouping window — consecutive messages from the same sender within this
// gap render as one visual block (name/avatar shown once), like WhatsApp.
const GROUP_WINDOW_MS = 5 * 60 * 1000;

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-teal-500",
  "bg-orange-500",
];

function avatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Highlights "@Full Name" for any name in the known participants list —
// matched against real names rather than a blind @word regex, so a
// message like "e-mail@dominio.com" or "@" on its own never gets styled.
function renderWithMentions(text: string, knownNames: string[], mine: boolean): React.ReactNode {
  if (knownNames.length === 0) return text;
  const sorted = [...knownNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(${sorted.map(escapeRegExp).join("|")})(?!\\w)`, "g");
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <span key={key++} className={cn("font-semibold underline decoration-2 underline-offset-2", mine ? "text-white" : "text-primary")}>
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function CommunityChat({
  initialMessages,
  currentUserId,
  currentUserName,
  isAdmin,
}: {
  initialMessages: CommunityChatMessage[];
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [participants, setParticipants] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const m of initialMessages) {
      if (m.user_id) map.set(m.user_id, m.user_name);
    }
    return map;
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("community-chat", { config: { presence: { key: currentUserId } } });

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_chat_messages" }, (payload) => {
        const row = payload.new as CommunityChatMessage;
        setMessages((prev) => [...prev, row]);
        if (row.user_id) {
          setParticipants((prev) => (prev.get(row.user_id!) === row.user_name ? prev : new Map(prev).set(row.user_id!, row.user_name)));
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_chat_messages" }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_name: string }>();
        setOnlineCount(Object.keys(state).length);
        setParticipants((prev) => {
          const next = new Map(prev);
          for (const [userId, presences] of Object.entries(state)) {
            const name = presences[0]?.user_name;
            if (name) next.set(userId, name);
          }
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_name: currentUserName, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const knownNames = useMemo(
    () =>
      Array.from(new Set([LUNA_CHAT_NAME, ...Array.from(participants.values())].filter((n) => n !== currentUserName))),
    [participants, currentUserName]
  );

  const mentionMatch = text.match(/(?:^|\s)@([^\s@]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const mentionSuggestions: [string, string][] =
    mentionQuery !== null
      ? [
          ...(LUNA_CHAT_NAME.toLowerCase().includes(mentionQuery) ? ([["luna", LUNA_CHAT_NAME]] as [string, string][]) : []),
          ...Array.from(participants.entries()).filter(
            ([id, name]) => id !== currentUserId && name.toLowerCase().includes(mentionQuery)
          ),
        ].slice(0, 5)
      : [];

  function selectMention(name: string) {
    setText((t) => t.replace(/(?:^|\s)@([^\s@]*)$/, (m) => `${m.startsWith(" ") ? " " : ""}@${name} `));
    inputRef.current?.focus();
  }

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
    <div className="flex h-[75vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white">
          <MessagesSquare className="h-5 w-5" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">Chat da Comunidade</p>
          <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {onlineCount} online agora
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-1 overflow-y-auto bg-[repeating-linear-gradient(135deg,transparent,transparent_28px,rgba(0,0,0,0.015)_28px,rgba(0,0,0,0.015)_29px)] p-4 dark:bg-[repeating-linear-gradient(135deg,transparent,transparent_28px,rgba(255,255,255,0.02)_28px,rgba(255,255,255,0.02)_29px)]">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessagesSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ainda não há mensagens. Seja o primeiro a dizer olá!</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.user_id === currentUserId;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const startsGroup =
              !prev ||
              prev.user_id !== m.user_id ||
              new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > GROUP_WINDOW_MS;
            const endsGroup =
              !next ||
              next.user_id !== m.user_id ||
              new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > GROUP_WINDOW_MS;

            const isLuna = m.user_role === "bot";

            return (
              <div key={m.id} className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start", startsGroup ? "mt-3" : "mt-0.5")}>
                {!mine && (
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                      endsGroup ? (isLuna ? "bg-brand-gradient" : avatarColor(m.user_id as string)) : "opacity-0"
                    )}
                  >
                    {endsGroup ? isLuna ? <Sparkles className="h-3.5 w-3.5" /> : initials(m.user_name) : null}
                  </span>
                )}
                <div
                  className={cn(
                    "relative max-w-[75%] px-3.5 py-2 text-sm shadow-sm",
                    mine
                      ? "bg-brand-gradient text-white"
                      : isLuna
                        ? "border border-primary/20 bg-primary/5"
                        : "border border-border/60 bg-background",
                    // WhatsApp-style corner rounding depending on position in group
                    mine
                      ? cn("rounded-2xl", startsGroup ? "rounded-tr-md" : "", endsGroup ? "rounded-br-md" : "rounded-br-2xl")
                      : cn("rounded-2xl", startsGroup ? "rounded-tl-md" : "", endsGroup ? "rounded-bl-md" : "rounded-bl-2xl")
                  )}
                >
                  {!mine && startsGroup && (
                    <p className="mb-0.5 text-xs font-semibold" style={{ color: "inherit" }}>
                      <span className={cn("opacity-90", isLuna && "text-primary")}>{m.user_name}</span>{" "}
                      <span className="font-normal opacity-60">· {ROLE_LABEL[m.user_role] ?? m.user_role}</span>
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">
                    {renderWithMentions(m.message, knownNames.concat(currentUserName), mine)}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    <p className={cn("text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
                      {new Date(m.created_at).toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className={cn(
                          "opacity-0 transition-opacity group-hover:opacity-100",
                          mine ? "text-white/80" : "text-muted-foreground"
                        )}
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

      {/* Composer */}
      <form onSubmit={handleSend} className="relative flex items-center gap-2 border-t border-border bg-card p-3">
        {mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
            {mentionSuggestions.map(([id, name]) => (
              <button
                key={id}
                type="button"
                onClick={() => selectMention(name)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white", avatarColor(id))}>
                  {initials(name)}
                </span>
                {name}
              </button>
            ))}
          </div>
        )}
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem… (use @ para mencionar)"
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={pending}
          className="rounded-full bg-muted px-4"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-sm transition-opacity disabled:opacity-40"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
