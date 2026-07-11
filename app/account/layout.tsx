import { redirect } from "next/navigation";
import { Package, Download, History, UserRound, Share2 } from "lucide-react";
import { Shell, type ShellNavItem } from "@/components/shell";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyNotifications } from "@/lib/data/notifications";

const NAV: ShellNavItem[] = [
  { href: "/account/products", label: "Meus Produtos", icon: Package },
  { href: "/account/downloads", label: "Downloads", icon: Download },
  { href: "/account/affiliates", label: "Afiliados", icon: Share2 },
  { href: "/account/history", label: "Histórico", icon: History },
  { href: "/account/profile", label: "Perfil", icon: UserRound },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?next=/account/products");

  const notifications = await getMyNotifications(user.id);

  return (
    <Shell navItems={NAV} notifications={notifications}>
      {children}
    </Shell>
  );
}
