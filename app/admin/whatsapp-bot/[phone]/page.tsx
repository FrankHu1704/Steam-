import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getWhatsappBotThread } from "@/lib/data/admin";

export default async function AdminWhatsappBotThreadPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const messages = await getWhatsappBotThread(phone);
  if (messages.length === 0) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/whatsapp-bot"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar às conversas
        </Link>
        <h1 className="mt-3 text-2xl font-bold">{phone}</h1>
        <p className="text-sm text-muted-foreground">{messages.length} mensagens nesta conversa.</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "assistant" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  m.role === "assistant" ? "bg-muted" : "bg-brand-gradient text-white"
                )}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {m.role === "assistant" ? (
                    <>
                      <Bot className="h-3 w-3" /> Assistente
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" /> Cliente
                    </>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
                <p className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleString("pt-MZ")}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
