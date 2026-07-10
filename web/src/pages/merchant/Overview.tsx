import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/DashboardLayout";
import { StatusBadge } from "../../components/StatusBadge";

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
}

export function Overview() {
  const { merchant } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  useEffect(() => {
    if (!merchant) return;
    const q = query(
      collection(db, "payments"),
      where("merchantId", "==", merchant.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    return onSnapshot(q, (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentRow, "id">) })));
    });
  }, [merchant]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-brand-900">Visão Geral</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Saldo Disponível</p>
          <p className="mt-2 text-3xl font-bold text-brand-900">
            {(merchant?.balanceAvailable ?? 0).toFixed(2)} {merchant?.currency ?? "MZN"}
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Saldo Pendente (em saque)</p>
          <p className="mt-2 text-3xl font-bold text-brand-900">
            {(merchant?.balancePending ?? 0).toFixed(2)} {merchant?.currency ?? "MZN"}
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Estado da Conta</p>
          <div className="mt-2">
            <StatusBadge status={merchant?.status ?? "pending"} />
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-brand-900">Pagamentos Recentes</h2>
      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Ainda sem pagamentos.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  {p.amount.toFixed(2)} {p.currency}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.paymentMethod ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
