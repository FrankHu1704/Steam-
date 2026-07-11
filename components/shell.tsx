"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { signOut } from "@/lib/actions/auth";
import type { Notification } from "@/types/database";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

export function Shell({
  navItems,
  badge,
  notifications = [],
  children,
}: {
  navItems: ShellNavItem[];
  badge?: string;
  notifications?: Notification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <Link href="/" className="flex items-center gap-2 px-6 py-5 text-lg font-bold">
          Paga<span className="text-gradient">Já</span>
          {badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
              {badge}
            </span>
          )}
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-brand-gradient text-white shadow-md" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOut} className="border-t border-border p-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
            <LogOut className="h-4 w-4" />
            Terminar Sessão
          </button>
        </form>
      </aside>
      <div className="flex-1 md:pl-64">
        <header className="flex items-center justify-end gap-2 border-b border-border bg-card/60 px-6 py-3 backdrop-blur">
          <NotificationsBell notifications={notifications} />
          <ThemeToggle />
        </header>
        <main className="p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
