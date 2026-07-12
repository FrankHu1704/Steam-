"use client";

import { useState } from "react";
import { Plan } from "@/lib/plans";

type Status = "form" | "loading" | "success" | "error";

export default function CheckoutModal({
  plan,
  onClose,
}: {
  plan: Plan;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Status>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          customer: { name, email, phone },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Falha ao iniciar pagamento");
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Erro inesperado. Tente novamente."
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1420] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              Contratar {plan.name}
            </h3>
            <p className="mt-1 text-sm text-white/50">
              {plan.price} MT/mês · {plan.memory} · {plan.cpu}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {status === "success" ? (
          <div className="mt-6 text-center">
            <div className="text-4xl">✅</div>
            <p className="mt-3 font-semibold text-white">
              Pagamento confirmado!
            </p>
            <p className="mt-1 text-sm text-white/60">
              Enviámos as credenciais de acesso para o seu email.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">
                Nome completo
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-primary"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">
                Email
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-primary"
                placeholder="voce@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">
                Telefone / M-Pesa
              </label>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-primary"
                placeholder="+258 84 000 0000"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-400">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
            >
              {status === "loading" ? "A processar..." : "Pagar e Ativar Bot"}
            </button>

            <p className="text-center text-xs text-white/40">
              Pagamento seguro via Débito Pay
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
