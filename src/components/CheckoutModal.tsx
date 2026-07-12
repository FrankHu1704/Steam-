"use client";

import { useEffect, useRef, useState } from "react";
import { Plan } from "@/lib/plans";

type Status = "form" | "waiting" | "paid" | "failed";
type Method = "mpesa" | "emola";

const MAX_ATTEMPTS = 90; // ~6 min a 4s
const POLL_INTERVAL_MS = 4000;

export default function CheckoutModal({
  plan,
  onClose,
}: {
  plan: Plan;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Status>("form");
  const [method, setMethod] = useState<Method>("mpesa");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [pollMessage, setPollMessage] = useState("A aguardar STK Push...");
  const paymentId = useRef<string | null>(null);
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          method,
          customer: { name, email, phone },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Falha ao iniciar pagamento");
      }

      paymentId.current = data.paymentId;
      attempts.current = 0;
      setStatus("waiting");
      poll();
    } catch (err) {
      setStatus("failed");
      setErrorMsg(
        err instanceof Error ? err.message : "Erro inesperado. Tente novamente."
      );
    }
  }

  function poll() {
    attempts.current += 1;

    fetch("/api/checkout/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: paymentId.current, planId: plan.id }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "paid") {
          setStatus("paid");
          return;
        }
        if (["failed", "cancelled", "expired", "mismatch", "error"].includes(d.status)) {
          setStatus("failed");
          setErrorMsg(d.message || "Pagamento não concluído.");
          return;
        }
        setPollMessage(`A aguardar PIN no telemóvel... (${attempts.current})`);
        schedule();
      })
      .catch(() => schedule());
  }

  function schedule() {
    if (attempts.current >= MAX_ATTEMPTS) {
      setStatus("failed");
      setErrorMsg(
        "Tempo esgotado. Se já introduziu o PIN, aguarde alguns minutos e verifique o email de confirmação."
      );
      return;
    }
    timer.current = setTimeout(poll, POLL_INTERVAL_MS);
  }

  function retry() {
    setStatus("form");
    setErrorMsg("");
    paymentId.current = null;
    attempts.current = 0;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={status === "form" ? onClose : undefined}
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
          {status === "form" && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
            >
              ✕
            </button>
          )}
        </div>

        {status === "paid" && (
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
        )}

        {status === "waiting" && (
          <div className="mt-6 text-center">
            <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
            <p className="font-semibold text-white">
              Verifique o seu telemóvel e introduza o PIN
            </p>
            <p className="mt-1 text-sm text-white/60">
              {method === "mpesa" ? "M-Pesa" : "e-Mola"} — {phone}
            </p>
            <div className="mt-4 rounded-lg bg-white/5 px-4 py-2.5 text-sm text-white/60">
              {pollMessage}
            </div>
            <p className="mt-3 text-xs text-white/40">
              Não feche esta janela. A confirmação é automática.
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="mt-6 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="mt-3 font-semibold text-white">
              Pagamento não concluído
            </p>
            <p className="mt-1 text-sm text-red-400">{errorMsg}</p>
            <button
              onClick={retry}
              className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {status === "form" && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/60">
                Método de pagamento
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["mpesa", "emola"] as Method[]).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                      method === m
                        ? "border-accent bg-accent/10 text-white"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/25"
                    }`}
                  >
                    {m === "mpesa" ? "M-Pesa" : "e-Mola"}
                  </button>
                ))}
              </div>
            </div>

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
                Número {method === "mpesa" ? "M-Pesa" : "e-Mola"}
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
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent-dark"
            >
              Pagar e Ativar Bot
            </button>

            <p className="text-center text-xs text-white/40">
              Pagamento seguro via DebitoPay
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
