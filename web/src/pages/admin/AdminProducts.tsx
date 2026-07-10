import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { AdminLayout } from "../../components/AdminLayout";
import { StatusBadge } from "../../components/StatusBadge";
import { PRODUCT_TYPES, type ProductType } from "../../lib/productTypes";

interface ProductRow {
  id: string;
  merchantId: string;
  type: ProductType;
  name: string;
  description: string;
  price: number;
  currency: string;
  coverImageUrl: string | null;
  files: { name: string; path: string }[];
  affiliateEnabled: boolean;
  affiliateCommissionPercent: number;
  status: "pending" | "approved" | "rejected";
}

export function AdminProducts() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filesById, setFilesById] = useState<Record<string, { name: string; url: string }[]>>({});

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

  async function loadFiles(productId: string) {
    setBusyId(productId);
    try {
      const adminGetProductFiles = httpsCallable(functions, "adminGetProductFiles");
      const res = await adminGetProductFiles({ productId });
      setFilesById((prev) => ({
        ...prev,
        [productId]: (res.data as { files: { name: string; url: string }[] }).files,
      }));
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
        {filtered.length === 0 && <p className="text-slate-400">Nada por aqui.</p>}
        {filtered.map((p) => {
          const typeInfo = PRODUCT_TYPES.find((t) => t.value === p.type);
          return (
            <div key={p.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  {p.coverImageUrl ? (
                    <img
                      src={p.coverImageUrl}
                      alt={p.name}
                      className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                      {typeInfo && <typeInfo.icon className="h-6 w-6 text-brand-500" />}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase text-brand-500">{typeInfo?.label}</p>
                    <p className="font-semibold text-brand-900">{p.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{p.description}</p>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-3 font-medium">
                {p.price.toFixed(2)} {p.currency}
              </p>
              {p.affiliateEnabled && (
                <p className="mt-1 text-xs text-emerald-600">
                  Afiliação ativa · {p.affiliateCommissionPercent}%
                </p>
              )}
              <p className="mt-1 font-mono text-xs text-slate-400">
                merchant: {p.merchantId.slice(0, 8)}…
              </p>

              {p.files?.length > 0 && (
                <div className="mt-3">
                  {!filesById[p.id] ? (
                    <button
                      disabled={busyId === p.id}
                      onClick={() => loadFiles(p.id)}
                      className="text-xs font-semibold text-brand-600 underline disabled:opacity-50"
                    >
                      Ver {p.files.length} ficheiro(s) para revisão
                    </button>
                  ) : (
                    <ul className="space-y-1">
                      {filesById[p.id].map((f) => (
                        <li key={f.url}>
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-brand-600 underline"
                          >
                            {f.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

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
          );
        })}
      </div>
    </AdminLayout>
  );
}
