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
} from "lucide-react";
import { Shell, type ShellNavItem } from "@/components/shell";
import { requireAdminUser } from "@/lib/data/admin";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyNotifications } from "@/lib/data/notifications";

const NAV: ShellNavItem[] = [
  { href: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Produtos", icon: Package },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/withdrawals", label: "Saques", icon: Wallet },
  { href: "/admin/users", label: "Utilizadores", icon: Users2 },
  { href: "/admin/categories", label: "Categorias", icon: Tag },
  { href: "/admin/settings", label: "Definições", icon: Settings },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
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
