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
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
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
