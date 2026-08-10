import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Package, Download, History, UserRound, Share2 } from "lucide-react";
import { Shell, type ShellNavItem } from "@/components/shell";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyNotifications } from "@/lib/data/notifications";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const NAV: ShellNavItem[] = [
  { href: "/account/products", label: "Meus Produtos", icon: <Package className="h-4 w-4" /> },
  { href: "/account/downloads", label: "Downloads", icon: <Download className="h-4 w-4" /> },
  { href: "/account/affiliates", label: "Afiliados", icon: <Share2 className="h-4 w-4" /> },
  { href: "/account/history", label: "Histórico", icon: <History className="h-4 w-4" /> },
  { href: "/account/profile", label: "Perfil", icon: <UserRound className="h-4 w-4" /> },
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
