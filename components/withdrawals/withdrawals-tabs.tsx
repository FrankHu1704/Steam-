"use client";

import { useState, type ReactNode } from "react";
import { LayoutGrid, History, Wallet as WalletIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Visão Geral", icon: LayoutGrid },
  { id: "history", label: "Histórico", icon: History },
  { id: "accounts", label: "Contas", icon: WalletIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function WithdrawalsTabs({
  overview,
  history,
  accounts,
}: {
  overview: ReactNode;
  history: ReactNode;
  accounts: ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div>
      <div className="flex gap-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex items-center gap-1.5 pb-3 text-sm font-medium transition-colors",
              tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {tab === t.id && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand-gradient" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && overview}
        {tab === "history" && history}
        {tab === "accounts" && accounts}
      </div>
    </div>
  );
}
