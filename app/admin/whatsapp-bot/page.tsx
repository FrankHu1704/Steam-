import Link from "next/link";
import { MessageCircle, User, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWhatsappBotConversations } from "@/lib/data/admin";

export default async function AdminWhatsappBotPage() {
  const conversations = await getWhatsappBotConversations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assistente WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Conversas com o assistente automático da PagaJá no WhatsApp.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Ainda sem conversas</p>
              <p className="text-sm text-muted-foreground">
                Assim que alguém escrever ao número de WhatsApp da PagaJá, a conversa aparece aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((c) => (
                <Link
                  key={c.phone}
                  href={`/admin/whatsapp-bot/${encodeURIComponent(c.phone)}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{c.phone}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {c.lastRole === "assistant" ? (
                          <Bot className="h-3 w-3 shrink-0" />
                        ) : (
                          <User className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate">{c.lastMessage}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant="secondary">{c.messageCount} msgs</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.lastMessageAt).toLocaleString("pt-MZ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
