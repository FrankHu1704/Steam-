"use client";

import { useState } from "react";
import Link from "next/link";
import { Profile, BotFileRow, ProfileStatus } from "@/lib/types";
import { plans } from "@/lib/plans";

const STATUS_LABEL: Record<ProfileStatus, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  pausado: "Pausado",
  erro: "Erro",
};

const STATUS_COLOR: Record<ProfileStatus, string> = {
  pendente: "bg-white/10 text-white/50",
  ativo: "bg-accent/15 text-accent",
  pausado: "bg-white/10 text-white/60",
  erro: "bg-red-500/15 text-red-400",
};

export default function AdminClient({
  customers,
  files,
}: {
  customers: Profile[];
  files: BotFileRow[];
}) {
  const [list, setList] = useState(customers);
  const [error, setError] = useState("");

  const filesFor = (customerId: string) =>
    files.filter((f) => f.customer_id === customerId);

  const isTrialExpired = (c: Profile) =>
    c.plan_id === "trial" &&
    c.trial_ends_at !== null &&
    new Date(c.trial_ends_at).getTime() < Date.now();

  const planPrice = (planId: string | null) =>
    plans.find((p) => p.id === planId)?.price ?? 0;

  const totalClients = list.length;
  const mrr = list
    .filter((c) => c.status === "ativo")
    .reduce((sum, c) => sum + planPrice(c.plan_id), 0);
  const activeBots = list.filter((c) => c.status === "ativo").length;

  async function toggleStatus(customer: Profile) {
    const next = customer.status === "ativo" ? "pausado" : "ativo";
    setError("");

    const res = await fetch(`/api/admin/customers/${customer.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message || "Falha ao atualizar status.");
      return;
    }

    setList((prev) =>
      prev.map((c) => (c.id === customer.id ? { ...c, status: next } : c))
    );
  }

  async function handleDownload(fileId: string) {
    setError("");
    const res = await fetch(`/api/admin/files/${fileId}/download`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url) {
      setError(data?.message || "Erro ao gerar link.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12 sm:px-8">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        ← Senga Host
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-white">
        Painel Administrativo
      </h1>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-glass p-5">
          <p className="text-xs text-white/50">Total de Clientes</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalClients}</p>
        </div>
        <div className="card-glass p-5">
          <p className="text-xs text-white/50">Receita Mensal (MRR)</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {mrr.toLocaleString("pt-MZ")} MT
          </p>
        </div>
        <div className="card-glass p-5">
          <p className="text-xs text-white/50">Bots Ativos</p>
          <p className="mt-1 text-2xl font-bold text-white">{activeBots}</p>
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
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-white/40">
                  Ainda não há clientes.
                </td>
              </tr>
            ) : (
              list.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{c.name || "—"}</p>
                    <p className="text-xs text-white/40">{c.email}</p>
                  </td>
                  <td className="px-5 py-4 text-white/70">
                    {c.plan_id ? c.plan_id.toUpperCase() : "—"}
                  </td>
                  <td className="px-5 py-4 text-white/70">
                    {filesFor(c.id).length === 0 ? (
                      <span className="text-white/30">Nenhum</span>
                    ) : (
                      <ul className="space-y-1">
                        {filesFor(c.id).map((f) => (
                          <li key={f.id}>
                            <button
                              onClick={() => handleDownload(f.id)}
                              className="text-primary-light underline decoration-dotted hover:text-white"
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
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isTrialExpired(c) ? STATUS_COLOR.pausado : STATUS_COLOR[c.status]
                      }`}
                    >
                      {isTrialExpired(c) ? "Teste Expirado" : STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white/50">
                    {new Date(c.created_at).toLocaleDateString("pt-MZ")}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => toggleStatus(c)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      {c.status === "ativo" ? "Pausar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
