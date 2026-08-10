"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { InstallAppButton } from "@/components/install-app-button";
import { SupportBubble } from "@/components/support/support-bubble";
import { signOut } from "@/lib/actions/auth";
import type { Notification } from "@/types/database";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

function NavLinks({ navItems, pathname, onNavigate }: { navItems: ShellNavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {navItems.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-brand-gradient text-white shadow-md" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function Shell({
  navItems,
  badge,
  notifications = [],
  signOutRedirect,
  children,
}: {
  navItems: ShellNavItem[];
  badge?: string;
  notifications?: Notification[];
  signOutRedirect?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
          <NavLinks navItems={navItems} pathname={pathname} />
        </nav>
        <form action={signOut} className="border-t border-border p-3">
          {signOutRedirect && <input type="hidden" name="next" value={signOutRedirect} />}
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
            <LogOut className="h-4 w-4" />
            Terminar Sessão
          </button>
        </form>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between px-6 py-5">
              <Link href="/" className="flex items-center gap-2 text-lg font-bold">
                Paga<span className="text-gradient">Já</span>
                {badge && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    {badge}
                  </span>
                )}
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3">
              <NavLinks navItems={navItems} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </nav>
            <form action={signOut} className="border-t border-border p-3">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                <LogOut className="h-4 w-4" />
                Terminar Sessão
              </button>
            </form>
          </aside>
        </div>
      )}

      <div className="flex-1 md:pl-64">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-card/60 px-4 py-3 backdrop-blur md:justify-end md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <InstallAppButton />
            <NotificationsBell notifications={notifications} />
            <ThemeToggle />
          </div>
        </header>
        <main className="p-4 sm:p-6 md:p-8">{children}</main>
      </div>
      <SupportBubble />
    </div>
  );
}
