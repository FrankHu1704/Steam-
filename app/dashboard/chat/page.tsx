import { redirect } from "next/navigation";
import { CommunityChat } from "@/components/chat/community-chat";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getRecentChatMessages } from "@/lib/data/chat";

export default async function DashboardChatPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login?next=/dashboard/chat");

  const messages = await getRecentChatMessages();

  return (
    <CommunityChat
      initialMessages={messages}
      currentUserId={user.id}
      currentUserName={profile.name}
      isAdmin={profile.role === "admin"}
    />
  );
}
