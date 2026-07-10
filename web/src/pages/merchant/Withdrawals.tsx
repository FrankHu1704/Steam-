import { useEffect, useMemo, useState, type FormEvent } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/DashboardLayout";
import { StatusBadge } from "../../components/StatusBadge";
import { WITHDRAWAL_METHODS, WITHDRAWAL_FEE_PERCENT, computeWithdrawalFee } from "../../lib/fees";

interface WithdrawalRow {
  id: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  payoutMethod: string;
  destination: string;
  status: string;
  rejectionReason: string | null;
}

export function Withdrawals() {
  const { merchant } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [amount, setAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<string>(WITHDRAWAL_METHODS[0].value);
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!merchant) return;
    const q = query(
      collection(db, "withdrawals"),
      where("merchantId", "==", merchant.uid),
      orderBy("requestedAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WithdrawalRow, "id">) })));
    });
  }, [merchant]);

  const preview = useMemo(() => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return null;
    return computeWithdrawalFee(parsed);
  }, [amount]);

  const destinationLabel =
    WITHDRAWAL_METHODS.find((m) => m.value === payoutMethod)?.destinationLabel ?? "Destino";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const requestWithdrawal = httpsCallable(functions, "requestWithdrawal");
      await requestWithdrawal({ amount: Number(amount), payoutMethod, destination });
      setAmount("");
      setDestination("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const canWithdraw = merchant?.status === "active";

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-brand-900">Saques</h1>
      <p className="mt-1 text-sm text-slate-500">
        Saldo disponível: <strong>{(merchant?.balanceAvailable ?? 0).toFixed(2)} {merchant?.currency}</strong>
        {" · "}Taxa de saque: <strong>{WITHDRAWAL_FEE_PERCENT}%</strong>
      </p>

      {!canWithdraw && (
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          A sua conta precisa de ser ativada por um administrador antes de pedir saques.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Valor</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Método</label>
          <select
            value={payoutMethod}
            onChange={(e) => setPayoutMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {WITHDRAWAL_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">{destinationLabel}</label>
          <input
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {preview && (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-sm md:col-span-2">
            <div>
              <p className="text-slate-500">Taxa ({WITHDRAWAL_FEE_PERCENT}%)</p>
              <p className="font-semibold text-slate-700">
                -{preview.feeAmount.toFixed(2)} {merchant?.currency}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Vai receber</p>
              <p className="font-semibold text-emerald-700">
                {preview.netAmount.toFixed(2)} {merchant?.currency}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting || !canWithdraw}
            className="rounded-lg bg-brand-500 px-5 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? "A enviar…" : "Pedir Saque"}
          </button>
        </div>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Valor Solicitado</th>
              <th className="px-4 py-3">Taxa</th>
              <th className="px-4 py-3">Valor Líquido</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Ainda sem pedidos de saque.
                </td>
              </tr>
            )}
            {withdrawals.map((w) => (
              <tr key={w.id} className="border-t border-slate-100 align-top">
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
                  {w.status === "rejected" && w.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">Motivo: {w.rejectionReason}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
