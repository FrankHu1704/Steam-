import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const LINKS = [
  { to: "/admin", label: "Visão Geral" },
  { to: "/admin/withdrawals", label: "Saques" },
  { to: "/admin/products", label: "Produtos" },
  { to: "/admin/merchants", label: "Merchants" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-900 text-white">
        <div className="px-6 py-5 text-lg font-bold">
          Paga<span className="text-brand-400">Já</span> Admin
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                location.pathname === link.to
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => signOut(auth)}
          className="mx-3 mt-8 block rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          Terminar Sessão
        </button>
      </aside>
      <main className="flex-1 bg-slate-50 p-8">{children}</main>
    </div>
  );
}
