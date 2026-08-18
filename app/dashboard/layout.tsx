import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users2,
  Wallet,
  Settings,
  Tag,
  Code2,
  Megaphone,
  Puzzle,
  Sparkles,
  Star,
  Trophy,
  MessageCircle,
  ShieldCheck,
  Wrench,
  IdCard,
} from "lucide-react";
import { Shell, type ShellNavItem } from "@/components/shell";
import { ProducerPendingScreen } from "@/components/dashboard/producer-pending-screen";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyNotifications } from "@/lib/data/notifications";
import { getEmployeeByUserId } from "@/lib/data/employees";
import { notifyAdminsOfPendingProducer } from "@/lib/actions/admin";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const NAV: ShellNavItem[] = [
  { href: "/dashboard", label: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { href: "/dashboard/luna", label: "LunaAI", icon: <Sparkles className="h-4 w-4" /> },
  { href: "/dashboard/products", label: "Produtos", icon: <Package className="h-4 w-4" /> },
  { href: "/dashboard/orders", label: "Pedidos", icon: <ShoppingCart className="h-4 w-4" /> },
  { href: "/dashboard/coupons", label: "Cupões", icon: <Tag className="h-4 w-4" /> },
  { href: "/dashboard/campaigns", label: "Campanhas", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/dashboard/integracoes", label: "Integrações", icon: <Puzzle className="h-4 w-4" /> },
  { href: "/dashboard/afiliar-me", label: "Afiliados", icon: <Users2 className="h-4 w-4" /> },
  { href: "/dashboard/affiliates", label: "Meus Afiliados", icon: <Users2 className="h-4 w-4" /> },
  { href: "/dashboard/reviews", label: "Avaliações", icon: <Star className="h-4 w-4" /> },
  { href: "/dashboard/chat", label: "Chat", icon: <MessageCircle className="h-4 w-4" /> },
  { href: "/dashboard/achievements", label: "Premiações", icon: <Trophy className="h-4 w-4" /> },
  { href: "/dashboard/ferramentas", label: "Ferramentas", icon: <Wrench className="h-4 w-4" /> },
  { href: "/dashboard/verificacao", label: "Verificação", icon: <IdCard className="h-4 w-4" /> },
  { href: "/dashboard/withdrawals", label: "Saques", icon: <Wallet className="h-4 w-4" /> },
  { href: "/dashboard/developer", label: "Programador", icon: <Code2 className="h-4 w-4" /> },
  { href: "/dashboard/settings", label: "Definições", icon: <Settings className="h-4 w-4" /> },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?next=/dashboard");

  const employee = await getEmployeeByUserId(user.id);
  if (employee) redirect("/colaborador");

  // A buyer never becomes a producer automatically anymore (anti-fraud —
  // an admin has to approve every new selling account first). The first
  // time a buyer reaches any /dashboard page, this opens a pending
  // request and shows a waiting screen instead of the real dashboard;
  // role only ever flips to "producer" (and became_producer_at gets set)
  // in approveProducerAccount() (lib/actions/admin.ts), which is also
  // where the welcome email fires.
  if (profile && profile.role === "buyer") {
    if (!profile.producer_status) {
      const supabase = await createClient();
      await supabase.from("profiles").update({ producer_status: "pending" }).eq("id", user.id);
      await notifyAdminsOfPendingProducer(user.id, profile.name, profile.email);
      return <ProducerPendingScreen status="pending" />;
    }
    if (profile.producer_status === "pending") {
      return <ProducerPendingScreen status="pending" />;
    }
    if (profile.producer_status === "rejected") {
      return <ProducerPendingScreen status="rejected" reason={profile.producer_rejection_reason} />;
    }
  }

  const notifications = await getMyNotifications(user.id);

  const navItems = profile?.is_cto
    ? [NAV[0], { href: "/dashboard/cto", label: "Painel CTO", icon: <ShieldCheck className="h-4 w-4" /> }, ...NAV.slice(1)]
    : NAV;

  return (
    <Shell navItems={navItems} notifications={notifications}>
      {children}
    </Shell>
  );
}
