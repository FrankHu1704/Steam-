import { redirect } from "next/navigation";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { Shell, type ShellNavItem } from "@/components/shell";
import { createClient } from "@/lib/supabase/server";
import { getEmployeeByUserId } from "@/lib/data/employees";
import { getMyNotifications } from "@/lib/data/notifications";

const NAV: ShellNavItem[] = [
  { href: "/colaborador", label: "Visão Geral", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { href: "/colaborador/luna", label: "LunaAI", icon: <Sparkles className="h-4 w-4" /> },
];

export default async function ColaboradorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/colaborador/login");

  const employee = await getEmployeeByUserId(user.id);
  if (!employee || !employee.active) redirect("/colaborador/login");

  const notifications = await getMyNotifications(user.id);

  return (
    <Shell navItems={NAV} badge="Colaborador" notifications={notifications} signOutRedirect="/colaborador/login">
      {children}
    </Shell>
  );
}
