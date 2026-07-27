import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getLunaMessages } from "@/lib/data/luna";
import { LunaChat } from "@/components/luna/luna-chat";

export default async function LunaPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) return null;

  const messages = await getLunaMessages(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LunaAI</h1>
        <p className="text-sm text-muted-foreground">
          A sua assistente de marketing — peça dicas de vendas, como escalar anúncios, ou qualquer dúvida sobre o
          seu negócio.
        </p>
      </div>

      <LunaChat initialMessages={messages.map((m) => ({ role: m.role, content: m.content }))} />
    </div>
  );
}
