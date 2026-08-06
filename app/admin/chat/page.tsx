import { redirect } from "next/navigation";
import { CommunityChat } from "@/components/chat/community-chat";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getRecentChatMessages } from "@/lib/data/chat";

export default async function AdminChatPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login?next=/admin/chat");

  const messages = await getRecentChatMessages();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Chat da Comunidade</h1>
        <p className="text-sm text-muted-foreground">
          Espaço aberto para produtores e a equipa PagaJá. Como admin, pode apagar qualquer mensagem problemática —
          passe o rato sobre ela para ver o ícone de apagar.
        </p>
      </div>
      <CommunityChat initialMessages={messages} currentUserId={user.id} isAdmin={profile.role === "admin"} />
    </div>
  );
}
