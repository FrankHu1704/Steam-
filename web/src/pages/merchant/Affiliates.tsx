import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/DashboardLayout";
import { PRODUCT_TYPES, type ProductType } from "../../lib/productTypes";

interface ProductRow {
  id: string;
  merchantId: string;
  type: ProductType;
  name: string;
  price: number;
  currency: string;
  coverImageUrl: string | null;
  affiliateCommissionPercent: number;
}

interface AffiliateLinkRow {
  id: string;
  productId: string;
  clicks: number;
  sales: number;
  commissionEarned: number;
}

export function Affiliates() {
  const { merchant } = useAuth();
  const [available, setAvailable] = useState<ProductRow[]>([]);
  const [myLinks, setMyLinks] = useState<AffiliateLinkRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "products"),
      where("status", "==", "approved"),
      where("affiliateEnabled", "==", true),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setAvailable(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProductRow, "id">) })));
    });
  }, []);

  useEffect(() => {
    if (!merchant) return;
    const q = query(
      collection(db, "affiliateLinks"),
      where("affiliateUid", "==", merchant.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setMyLinks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AffiliateLinkRow, "id">) })));
    });
  }, [merchant]);

  async function joinAffiliate(productId: string) {
    if (!merchant) return;
    setBusyId(productId);
    try {
      const becomeAffiliate = httpsCallable(functions, "becomeAffiliate");
      await becomeAffiliate({ productId });
    } finally {
      setBusyId(null);
    }
  }

  function copyLink(productId: string) {
    if (!merchant) return;
    const url = `${window.location.origin}/produto/${productId}?ref=${merchant.uid}`;
    navigator.clipboard.writeText(url);
    setCopiedId(productId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const myLinkIds = new Set(myLinks.map((l) => l.productId));
  const others = available.filter((p) => p.merchantId !== merchant?.uid);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-brand-900">Programa de Afiliados</h1>
      <p className="mt-1 text-sm text-slate-500">
        Promova produtos de outros merchants e ganhe comissão por cada venda.
      </p>

      {myLinks.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-brand-900">Meus Links</h2>
          <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Cliques</th>
                  <th className="px-4 py-3">Vendas</th>
                  <th className="px-4 py-3">Comissão Ganha</th>
                  <th className="px-4 py-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {myLinks.map((l) => {
                  const p = available.find((prod) => prod.id === l.productId);
                  return (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{p?.name ?? l.productId.slice(0, 8)}</td>
                      <td className="px-4 py-3">{l.clicks}</td>
                      <td className="px-4 py-3">{l.sales}</td>
                      <td className="px-4 py-3">
                        {l.commissionEarned.toFixed(2)} {p?.currency}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyLink(l.productId)}
                          className="text-brand-600 underline"
                        >
                          {copiedId === l.productId ? "Copiado!" : "Copiar link"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mt-8 text-lg font-semibold text-brand-900">Produtos Disponíveis</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {others.length === 0 && <p className="text-slate-400">Nenhum produto com afiliação aberta.</p>}
        {others.map((p) => {
          const typeInfo = PRODUCT_TYPES.find((t) => t.value === p.type);
          const joined = myLinkIds.has(p.id);
          return (
            <div key={p.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex gap-3">
                {p.coverImageUrl ? (
                  <img src={p.coverImageUrl} className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50">
                    {typeInfo && <typeInfo.icon className="h-6 w-6 text-brand-500" />}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-brand-900">{p.name}</p>
                  <p className="text-sm text-slate-500">
                    {p.price.toFixed(2)} {p.currency} · {p.affiliateCommissionPercent}% comissão
                  </p>
                </div>
              </div>
              <div className="mt-3">
                {joined ? (
                  <button
                    onClick={() => copyLink(p.id)}
                    className="w-full rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
                  >
                    {copiedId === p.id ? "Copiado!" : "Copiar meu link"}
                  </button>
                ) : (
                  <button
                    disabled={busyId === p.id}
                    onClick={() => joinAffiliate(p.id)}
                    className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    Tornar-me Afiliado
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
