"use client";

import { useState } from "react";
import Link from "next/link";
import { mockCustomers, BotStatus } from "@/lib/mockData";
import { plans } from "@/lib/plans";
import PreviewBanner from "@/components/PreviewBanner";

const STATUS_LABEL: Record<BotStatus, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  erro: "Erro",
};

const STATUS_COLOR: Record<BotStatus, string> = {
  ativo: "bg-accent/15 text-accent",
  pausado: "bg-white/10 text-white/60",
  erro: "bg-red-500/15 text-red-400",
};

export default function AdminPage() {
  const [customers, setCustomers] = useState(mockCustomers);

  function toggleStatus(id: string) {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "ativo" ? "pausado" : "ativo" }
          : c
      )
    );
  }

  const planPrice = (planId: string) =>
    plans.find((p) => p.id === planId)?.price ?? 0;

  const totalClients = customers.length;
  const mrr = customers
    .filter((c) => c.status === "ativo")
    .reduce((sum, c) => sum + planPrice(c.planId), 0);
  const activeBots = customers.filter((c) => c.status === "ativo").length;

  return (
    <>
      <PreviewBanner />
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-12 sm:px-8">
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          ← Senga Host
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Painel Administrativo
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card-glass p-5">
            <p className="text-xs text-white/50">Total de Clientes</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {totalClients}
            </p>
          </div>
          <div className="card-glass p-5">
            <p className="text-xs text-white/50">Receita Mensal (MRR)</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {mrr.toLocaleString("pt-MZ")} MT
            </p>
          </div>
          <div className="card-glass p-5">
            <p className="text-xs text-white/50">Bots Ativos</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {activeBots}
            </p>
          </div>
        </div>

        <section className="card-glass mt-8 overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Plano</th>
                <th className="px-5 py-3 font-medium">Bots</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Desde</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{c.name}</p>
                    <p className="text-xs text-white/40">{c.email}</p>
                  </td>
                  <td className="px-5 py-4 text-white/70">
                    {c.planId.toUpperCase()}
                  </td>
                  <td className="px-5 py-4 text-white/70">
                    {c.files.length === 0 ? (
                      <span className="text-white/30">Nenhum</span>
                    ) : (
                      <ul className="space-y-1">
                        {c.files.map((f) => (
                          <li key={f.id}>
                            <button
                              disabled
                              title="Disponível após ligação ao armazenamento"
                              className="cursor-not-allowed text-primary-light/60 underline decoration-dotted"
                            >
                              {f.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[c.status]}`}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white/50">{c.createdAt}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => toggleStatus(c.id)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      {c.status === "ativo" ? "Pausar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
