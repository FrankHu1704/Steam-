import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { AdminLayout } from "../../components/AdminLayout";
import { StatusBadge } from "../../components/StatusBadge";

interface WithdrawalRow {
  id: string;
  merchantId: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  payoutMethod: string;
  destination: string;
  status: "pending" | "approved" | "rejected" | "paid";
}

export function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "withdrawals"), orderBy("requestedAt", "desc"));
    return onSnapshot(q, (snap) => {
      setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WithdrawalRow, "id">) })));
    });
  }, []);

  async function review(withdrawalId: string, decision: "approved" | "rejected") {
    setBusyId(withdrawalId);
    try {
      const reviewWithdrawal = httpsCallable(functions, "reviewWithdrawal");
      const rejectionReason =
        decision === "rejected" ? window.prompt("Motivo da rejeição:") ?? "" : undefined;
      await reviewWithdrawal({ withdrawalId, decision, rejectionReason });
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(withdrawalId: string) {
    const w = withdrawals.find((row) => row.id === withdrawalId);
    const payoutReference = window.prompt(
      `Referência do pagamento efetuado (enviar ${(w?.netAmount ?? w?.amount ?? 0).toFixed(2)} ${w?.currency ?? ""} para ${w?.destination ?? "?"}):`
    );
    if (!payoutReference) return;
    setBusyId(withdrawalId);
    try {
      const markWithdrawalPaid = httpsCallable(functions, "markWithdrawalPaid");
      await markWithdrawalPaid({ withdrawalId, payoutReference });
    } finally {
      setBusyId(null);
    }
  }

  const filtered = withdrawals.filter((w) => filter === "all" || w.status === filter);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-brand-900">Aprovação de Saques</h1>

      <div className="mt-4 flex gap-2">
        {(["pending", "approved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f ? "bg-brand-500 text-white" : "bg-white text-slate-600 shadow-sm"
            }`}
          >
            {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : "Todos"}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Merchant</th>
              <th className="px-4 py-3">Solicitado</th>
              <th className="px-4 py-3">Taxa</th>
              <th className="px-4 py-3">Pagar (líquido)</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Nada por aqui.
                </td>
              </tr>
            )}
            {filtered.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{w.merchantId.slice(0, 8)}…</td>
                <td className="px-4 py-3 font-medium">
                  {w.amount.toFixed(2)} {w.currency}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  -{(w.feeAmount ?? 0).toFixed(2)} {w.currency}
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-700">
                  {(w.netAmount ?? w.amount).toFixed(2)} {w.currency}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {w.payoutMethod} · {w.destination}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={w.status} />
                </td>
                <td className="px-4 py-3">
                  {w.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === w.id}
                        onClick={() => review(w.id, "approved")}
                        className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        disabled={busyId === w.id}
                        onClick={() => review(w.id, "rejected")}
                        className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                  {w.status === "approved" && (
                    <button
                      disabled={busyId === w.id}
                      onClick={() => markPaid(w.id)}
                      className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                    >
                      Marcar como Pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
