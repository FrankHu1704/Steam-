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
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/products", label: "Produtos", icon: Package },
  { href: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/dashboard/coupons", label: "Cupões", icon: Tag },
  { href: "/dashboard/affiliates", label: "Afiliados", icon: Users2 },
  { href: "/dashboard/withdrawals", label: "Saques", icon: Wallet },
  { href: "/dashboard/settings", label: "Definições", icon: Settings },
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
