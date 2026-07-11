import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users2,
  Wallet,
  Settings,
  Tag,
} from "lucide-react";
import { Shell, type ShellNavItem } from "@/components/shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyNotifications } from "@/lib/data/notifications";

const NAV: ShellNavItem[] = [
  { href: "/dashboard", label: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { href: "/dashboard/products", label: "Produtos", icon: <Package className="h-4 w-4" /> },
  { href: "/dashboard/orders", label: "Pedidos", icon: <ShoppingCart className="h-4 w-4" /> },
  { href: "/dashboard/coupons", label: "Cupões", icon: <Tag className="h-4 w-4" /> },
  { href: "/dashboard/affiliates", label: "Afiliados", icon: <Users2 className="h-4 w-4" /> },
  { href: "/dashboard/withdrawals", label: "Saques", icon: <Wallet className="h-4 w-4" /> },
  { href: "/dashboard/settings", label: "Definições", icon: <Settings className="h-4 w-4" /> },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?next=/dashboard");

  if (profile && profile.role === "buyer") {
    const supabase = await createClient();
    await supabase.from("profiles").update({ role: "producer" }).eq("id", user.id);
  }

  const notifications = await getMyNotifications(user.id);

  return (
    <Shell navItems={NAV} notifications={notifications}>
      {children}
    </Shell>
  );
}
