import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { to: "/dashboard", label: "Visão Geral", exact: true },
  { to: "/dashboard/products", label: "Produtos" },
  { to: "/dashboard/affiliates", label: "Afiliados" },
  { to: "/dashboard/payments", label: "Links de Pagamento" },
  { to: "/dashboard/withdrawals", label: "Saques" },
  { to: "/dashboard/settings", label: "Definições" },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { merchant } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-brand-900 text-white">
        <div className="px-6 py-5 text-lg font-bold">
          Paga<span className="text-brand-400">Já</span>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {LINKS.map((link) => {
            const active = link.exact
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => signOut(auth)}
          className="mx-3 mt-8 block rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          Terminar Sessão
        </button>
      </aside>
      <main className="flex-1 bg-slate-50">
        {merchant && merchant.status !== "active" && (
          <div className="bg-amber-100 px-8 py-3 text-sm text-amber-800">
            {merchant.status === "pending"
              ? "A sua conta está pendente de aprovação do administrador. Alguns recursos (saques) ficam bloqueados até a ativação."
              : "A sua conta foi suspensa. Contacte o suporte."}
          </div>
        )}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
