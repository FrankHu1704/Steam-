import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { AdminLayout } from "../../components/AdminLayout";
import { StatusBadge } from "../../components/StatusBadge";

interface ProductRow {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
}

export function AdminProducts() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProductRow, "id">) })));
    });
  }, []);

  async function review(productId: string, decision: "approved" | "rejected") {
    setBusyId(productId);
    try {
      const reviewProduct = httpsCallable(functions, "reviewProduct");
      const rejectionReason =
        decision === "rejected" ? window.prompt("Motivo da rejeição:") ?? "" : undefined;
      await reviewProduct({ productId, decision, rejectionReason });
    } finally {
      setBusyId(null);
    }
  }

  const filtered = products.filter((p) => filter === "all" || p.status === filter);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-brand-900">Aprovação de Produtos</h1>

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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {filtered.length === 0 && (
          <p className="text-slate-400">Nada por aqui.</p>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-brand-900">{p.name}</p>
                <p className="mt-1 text-sm text-slate-500">{p.description}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-3 font-medium">
              {p.price.toFixed(2)} {p.currency}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400">
              merchant: {p.merchantId.slice(0, 8)}…
            </p>
            {p.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <button
                  disabled={busyId === p.id}
                  onClick={() => review(p.id, "approved")}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  Aprovar
                </button>
                <button
                  disabled={busyId === p.id}
                  onClick={() => review(p.id, "rejected")}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  Rejeitar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
