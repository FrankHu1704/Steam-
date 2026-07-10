import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/DashboardLayout";
import { StatusBadge } from "../../components/StatusBadge";
import { PRODUCT_TYPES, type ProductType } from "../../lib/productTypes";

interface ProductDoc {
  merchantId: string;
  type: ProductType;
  name: string;
  price: number;
  currency: string;
  status: string;
  active: boolean;
  affiliateEnabled: boolean;
  affiliateCommissionPercent: number;
  viewCount: number;
  salesCount: number;
  rejectionReason: string | null;
}

interface PurchaseRow {
  id: string;
  customerName: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: { toDate: () => Date } | null;
}

interface AffiliateLinkRow {
  id: string;
  affiliateUid: string;
  clicks: number;
  sales: number;
  commissionEarned: number;
}

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { merchant } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductDoc | null>(null);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinkRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!productId) return;
    return onSnapshot(doc(db, "products", productId), (snap) => {
      if (snap.exists()) setProduct(snap.data() as ProductDoc);
    });
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    const q = query(
      collection(db, "payments"),
      where("productId", "==", productId),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setPurchases(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PurchaseRow, "id">) })));
    });
  }, [productId]);

  useEffect(() => {
    if (!productId || !product?.affiliateEnabled) return;
    const q = query(collection(db, "affiliateLinks"), where("productId", "==", productId));
    return onSnapshot(q, (snap) => {
      setAffiliateLinks(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AffiliateLinkRow, "id">) }))
      );
    });
  }, [productId, product?.affiliateEnabled]);

  if (!product || !merchant) {
    return (
      <DashboardLayout>
        <p className="text-slate-400">A carregar…</p>
      </DashboardLayout>
    );
  }

  const saleLink = `${window.location.origin}/produto/${productId}`;
  const typeInfo = PRODUCT_TYPES.find((t) => t.value === product.type);

  async function toggleActive() {
    setBusy(true);
    try {
      const toggleProductActive = httpsCallable(functions, "toggleProductActive");
      await toggleProductActive({ productId, active: !product!.active });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Apagar este produto? Esta ação não pode ser desfeita.")) return;
    setBusy(true);
    setError(null);
    try {
      const deleteProduct = httpsCallable(functions, "deleteProduct");
      await deleteProduct({ productId });
      navigate("/dashboard/products");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(saleLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-brand-500">{typeInfo?.label}</p>
          <h1 className="text-2xl font-bold text-brand-900">{product.name}</h1>
        </div>
        <StatusBadge status={product.status} />
      </div>

      {product.status === "rejected" && product.rejectionReason && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Motivo da rejeição: {product.rejectionReason}
        </div>
      )}

      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">Link de venda</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={saleLink}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
          />
          <button
            onClick={copyLink}
            className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Preço</p>
          <p className="mt-1 text-xl font-bold text-brand-900">
            {product.price.toFixed(2)} {product.currency}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Visualizações</p>
          <p className="mt-1 text-xl font-bold text-brand-900">{product.viewCount ?? 0}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Vendas</p>
          <p className="mt-1 text-xl font-bold text-brand-900">{product.salesCount ?? 0}</p>
        </div>
      </div>

      {product.affiliateEnabled && (
        <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
          <p className="font-semibold text-brand-900">
            Programa de Afiliados · {product.affiliateCommissionPercent}% por venda
          </p>
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Afiliados</p>
              <p className="font-semibold">{affiliateLinks.length}</p>
            </div>
            <div>
              <p className="text-slate-500">Cliques</p>
              <p className="font-semibold">
                {affiliateLinks.reduce((sum, l) => sum + (l.clicks ?? 0), 0)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Comissão paga</p>
              <p className="font-semibold">
                {affiliateLinks.reduce((sum, l) => sum + (l.commissionEarned ?? 0), 0).toFixed(2)}{" "}
                {product.currency}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl bg-white shadow-sm">
        <p className="border-b border-slate-100 px-5 py-4 font-semibold text-brand-900">
          Histórico de Compras
        </p>
        <table className="w-full text-left text-sm">
          <tbody>
            {purchases.length === 0 && (
              <tr>
                <td className="px-5 py-6 text-center text-slate-400">Ainda sem compras.</td>
              </tr>
            )}
            {purchases.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-5 py-3">{p.customerName ?? "—"}</td>
                <td className="px-5 py-3 font-medium">
                  {p.amount.toFixed(2)} {p.currency}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button
          onClick={toggleActive}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-5 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {product.active ? "Pausar Vendas" : "Reativar Vendas"}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy || product.salesCount > 0}
          title={product.salesCount > 0 ? "Produtos com vendas não podem ser apagados" : ""}
          className="rounded-lg border border-red-300 px-5 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          Apagar
        </button>
      </div>
    </DashboardLayout>
  );
}
