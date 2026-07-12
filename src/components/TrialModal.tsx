"use client";

import { useState } from "react";

type Status = "form" | "success" | "error";

export default function TrialModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: { name, email, phone } }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Falha ao iniciar o teste grátis.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
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
            <h3 className="text-lg font-bold text-white">Teste Grátis — 48h</h3>
            <p className="mt-1 text-sm text-white/50">
              Sem pagamento. Acesso total por 48 horas.
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

        {status === "success" && (
          <div className="mt-6 text-center">
            <div className="text-4xl">🎉</div>
            <p className="mt-3 font-semibold text-white">Teste ativado!</p>
            <p className="mt-1 text-sm text-white/60">
              Enviámos um link de acesso ao painel para o seu email. O teste
              expira em 48 horas.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Fechar
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="mt-3 font-semibold text-white">
              Não foi possível ativar
            </p>
            <p className="mt-1 text-sm text-red-400">{errorMsg}</p>
            <button
              onClick={() => setStatus("form")}
              className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {status === "form" && (
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
                Telefone
              </label>
              <input
                required
                type="tel"
                inputMode="numeric"
                maxLength={9}
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-primary"
                placeholder="84 000 0000"
              />
            </div>

            {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
            >
              {loading ? "A ativar..." : "Começar Teste Grátis"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
