import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";

interface PaymentDoc {
  amount: number;
  currency: "MZN" | "ZAR";
  status: string;
  checkoutUrl: string | null;
}

const METHODS_MZN = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "emola", label: "e-Mola" },
  { value: "mkesh", label: "mKesh" },
  { value: "visa_mastercard", label: "Visa / Mastercard" },
];
const METHODS_ZAR = [{ value: "payfast", label: "PayFast (Cartão/EFT)" }];

export function PublicCheckout() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [payment, setPayment] = useState<PaymentDoc | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [method, setMethod] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    return onSnapshot(doc(db, "payments", paymentId), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      setPayment(snap.data() as PaymentDoc);
    });
  }, [paymentId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const submitPayment = httpsCallable(functions, "submitPayment");
      const res = await submitPayment({
        paymentId,
        paymentMethod: method,
        customerName,
        customerEmail,
        customerPhone,
        returnUrl: window.location.href,
      });
      const data = res.data as { checkoutUrl: string | null };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Link de pagamento não encontrado.
      </div>
    );
  }
  if (!payment) {
    return <div className="flex h-screen items-center justify-center text-slate-500">A carregar…</div>;
  }

  const methods = payment.currency === "ZAR" ? METHODS_ZAR : METHODS_MZN;

  if (payment.status !== "awaiting_customer") {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-brand-900">
          {payment.status === "success" && "Pagamento confirmado ✅"}
          {payment.status === "pending" && "Pagamento a aguardar confirmação…"}
          {payment.status === "failed" && "Pagamento falhou"}
        </h1>
        <p className="mt-2 text-slate-500">
          {payment.amount.toFixed(2)} {payment.currency}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl bg-white p-8 shadow-sm">
      <p className="text-sm text-slate-500">Total a pagar</p>
      <p className="text-3xl font-bold text-brand-900">
        {payment.amount.toFixed(2)} {payment.currency}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Método de Pagamento</label>
          <select
            required
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Selecione…</option>
            {methods.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Nome</label>
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        {(method === "mpesa" || method === "emola" || method === "mkesh") && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Telefone</label>
            <input
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+258841234567"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !method}
          className="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "A processar…" : "Pagar Agora"}
        </button>
      </form>
    </div>
  );
}
