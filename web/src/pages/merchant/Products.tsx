import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/DashboardLayout";
import { StatusBadge } from "../../components/StatusBadge";
import { PRODUCT_TYPES, type ProductType } from "../../lib/productTypes";

interface ProductRow {
  id: string;
  type: ProductType;
  name: string;
  price: number;
  currency: string;
  coverImageUrl: string | null;
  status: string;
  active: boolean;
  viewCount: number;
  salesCount: number;
}

export function Products() {
  const { merchant } = useAuth();
  const [products, setProducts] = useState<ProductRow[]>([]);

  useEffect(() => {
    if (!merchant) return;
    const q = query(
      collection(db, "products"),
      where("merchantId", "==", merchant.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProductRow, "id">) })));
    });
  }, [merchant]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-900">Produtos</h1>
        <Link
          to="/dashboard/products/new"
          className="rounded-lg bg-brand-500 px-5 py-2 font-semibold text-white hover:bg-brand-600"
        >
          Criar Produto
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.length === 0 && (
          <p className="text-slate-400">Ainda sem produtos. Crie o primeiro.</p>
        )}
        {products.map((p) => {
          const typeInfo = PRODUCT_TYPES.find((t) => t.value === p.type);
          return (
            <Link
              key={p.id}
              to={`/dashboard/products/${p.id}`}
              className="rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex gap-3">
                {p.coverImageUrl ? (
                  <img
                    src={p.coverImageUrl}
                    alt={p.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    {typeInfo && <typeInfo.icon className="h-6 w-6 text-brand-500" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-brand-900">{p.name}</p>
                  <p className="text-xs text-slate-400">{typeInfo?.label}</p>
                  <p className="mt-1 font-medium">
                    {p.price.toFixed(2)} {p.currency}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge status={p.status} />
                {!p.active && (
                  <span className="text-xs font-semibold text-slate-400">Pausado</span>
                )}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>{p.viewCount ?? 0} visualizações</span>
                <span>{p.salesCount ?? 0} vendas</span>
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
