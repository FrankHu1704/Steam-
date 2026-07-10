import { useEffect, useState } from "react";
import { collection, orderBy, query, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { AdminLayout } from "../../components/AdminLayout";
import { StatusBadge } from "../../components/StatusBadge";

interface MerchantRow {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  status: "pending" | "active" | "suspended";
  balanceAvailable: number;
  balancePending: number;
  currency: string;
}

export function AdminMerchants() {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "merchants"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setMerchants(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MerchantRow, "id">) })));
    });
  }, []);

  async function review(merchantId: string, decision: "active" | "suspended") {
    setBusyId(merchantId);
    try {
      const reviewMerchant = httpsCallable(functions, "reviewMerchant");
      await reviewMerchant({ merchantId, decision });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-brand-900">Merchants</h1>

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Negócio</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {merchants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Ainda sem merchants.
                </td>
              </tr>
            )}
            {merchants.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{m.businessName || "(sem nome)"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {m.email}
                  <br />
                  {m.phone}
                </td>
                <td className="px-4 py-3">
                  {(m.balanceAvailable ?? 0).toFixed(2)} {m.currency}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={m.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {m.status !== "active" && (
                      <button
                        disabled={busyId === m.id}
                        onClick={() => review(m.id, "active")}
                        className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        Ativar
                      </button>
                    )}
                    {m.status !== "suspended" && (
                      <button
                        disabled={busyId === m.id}
                        onClick={() => review(m.id, "suspended")}
                        className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        Suspender
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
