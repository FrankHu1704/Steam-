import { redirect } from "next/navigation";
import { CommunityChat } from "@/components/chat/community-chat";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getRecentChatMessages } from "@/lib/data/chat";

export default async function DashboardChatPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login?next=/dashboard/chat");

  const messages = await getRecentChatMessages();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Chat da Comunidade</h1>
        <p className="text-sm text-muted-foreground">
          Espaço aberto para produtores e a equipa PagaJá conversarem e trocarem contactos. Seja respeitoso —
          mensagens que violem as regras podem ser removidas.
        </p>
      </div>
      <CommunityChat initialMessages={messages} currentUserId={user.id} isAdmin={profile.role === "admin"} />
    </div>
  );
}
