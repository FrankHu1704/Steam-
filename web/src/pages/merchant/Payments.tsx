import { useEffect, useState, type FormEvent } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/DashboardLayout";
import { StatusBadge } from "../../components/StatusBadge";

interface ProductRow {
  id: string;
  name: string;
  price: number;
  currency: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  productId: string | null;
}

export function Payments() {
  const { merchant } = useAuth();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [productId, setProductId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"MZN" | "ZAR">("MZN");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  useEffect(() => {
    if (!merchant) return;
    const productsQ = query(
      collection(db, "products"),
      where("merchantId", "==", merchant.uid),
      where("status", "==", "approved")
    );
    const unsubProducts = onSnapshot(productsQ, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProductRow, "id">) })));
    });

    const paymentsQ = query(
      collection(db, "payments"),
      where("merchantId", "==", merchant.uid),
      orderBy("createdAt", "desc")
    );
    const unsubPayments = onSnapshot(paymentsQ, (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentRow, "id">) })));
    });

    return () => {
      unsubProducts();
      unsubPayments();
    };
  }, [merchant]);

  function onSelectProduct(id: string) {
    setProductId(id);
    const p = products.find((prod) => prod.id === id);
    if (p) {
      setAmount(String(p.price));
      setCurrency(p.currency as "MZN" | "ZAR");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedLink(null);
    setSubmitting(true);
    try {
      const createPaymentLink = httpsCallable(functions, "createPaymentLink");
      const res = await createPaymentLink({
        productId: productId || undefined,
        amount: Number(amount),
        currency,
      });
      const { paymentId } = res.data as { paymentId: string };
      setCreatedLink(`${window.location.origin}/pay/${paymentId}`);
      setAmount("");
      setProductId("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-brand-900">Links de Pagamento</h1>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Produto (opcional)</label>
          <select
            value={productId}
            onChange={(e) => onSelectProduct(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Valor avulso</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.price.toFixed(2)} {p.currency})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Valor</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!!productId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "MZN" | "ZAR")}
              disabled={!!productId}
              className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
            >
              <option value="MZN">MZN</option>
              <option value="ZAR">ZAR</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
        {createdLink && (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 md:col-span-2">
            Link criado:{" "}
            <a href={createdLink} target="_blank" rel="noreferrer" className="font-semibold underline">
              {createdLink}
            </a>
          </div>
        )}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-500 px-5 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? "A criar…" : "Criar Link de Pagamento"}
          </button>
        </div>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Ainda sem links de pagamento.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  {p.amount.toFixed(2)} {p.currency}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/pay/${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 underline"
                  >
                    /pay/{p.id.slice(0, 8)}…
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
