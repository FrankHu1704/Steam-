import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Users2,
  Tag,
  Settings,
  ScrollText,
  Megaphone,
  Code2,
} from "lucide-react";
import { Shell, type ShellNavItem } from "@/components/shell";
import { requireAdminUser } from "@/lib/data/admin";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyNotifications } from "@/lib/data/notifications";

const NAV: ShellNavItem[] = [
  { href: "/admin", label: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { href: "/admin/products", label: "Produtos", icon: <Package className="h-4 w-4" /> },
  { href: "/admin/orders", label: "Pedidos", icon: <ShoppingCart className="h-4 w-4" /> },
  { href: "/admin/withdrawals", label: "Saques", icon: <Wallet className="h-4 w-4" /> },
  { href: "/admin/users", label: "Utilizadores", icon: <Users2 className="h-4 w-4" /> },
  { href: "/admin/categories", label: "Categorias", icon: <Tag className="h-4 w-4" /> },
  { href: "/admin/broadcast", label: "Comunicados", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/admin/production-unlocks", label: "Produção API", icon: <Code2 className="h-4 w-4" /> },
  { href: "/admin/settings", label: "Definições", icon: <Settings className="h-4 w-4" /> },
  { href: "/admin/logs", label: "Logs", icon: <ScrollText className="h-4 w-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?next=/admin");

  const admin = await requireAdminUser();
  if (!admin) redirect("/");

  const notifications = await getMyNotifications(user.id);

  return (
    <Shell navItems={NAV} badge="Admin" notifications={notifications}>
      {children}
    </Shell>
  );
}
