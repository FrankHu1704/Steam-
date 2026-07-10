import { useState, type FormEvent } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";

const METHODS_MZN = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "emola", label: "e-Mola" },
  { value: "mkesh", label: "mKesh" },
  { value: "visa_mastercard", label: "Visa / Mastercard" },
];
const METHODS_ZAR = [{ value: "payfast", label: "PayFast (Cartão/EFT)" }];

/** Standalone integration test page — not part of the normal checkout
 * flow. Calls Debito Pay's payment-orchestrator directly through the
 * testCharge Cloud Function (which holds the real API key server-side)
 * to confirm DEBITO_PAY_API_KEY / MERCHANT_ID / WALLET_CODE are wired up
 * correctly, without needing a merchant account or a product. */
export function TestCheckout() {
  const [method, setMethod] = useState("mpesa");
  const [amount, setAmount] = useState("50");
  const [currency, setCurrency] = useState<"MZN" | "ZAR">("MZN");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const methods = currency === "ZAR" ? METHODS_ZAR : METHODS_MZN;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const testCharge = httpsCallable(functions, "testCharge");
      const res = await testCharge({
        paymentMethod: method,
        amount: Number(amount),
        currency,
        customerName,
        customerEmail,
        customerPhone,
        returnUrl: window.location.href,
      });
      setResult(res.data as Record<string, unknown>);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Página de teste da integração Debito Pay — chama o payment-orchestrator
        diretamente para conferir as credenciais. Não faz parte do checkout normal
        da plataforma (isso fica em <code>/pay/&#123;id&#125;</code> e{" "}
        <code>/produto/&#123;id&#125;</code>).
      </div>

      <h1 className="mt-6 text-2xl font-bold text-brand-900">Teste de Checkout</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Moeda</label>
            <select
              value={currency}
              onChange={(e) => {
                const c = e.target.value as "MZN" | "ZAR";
                setCurrency(c);
                setMethod(c === "ZAR" ? "payfast" : "mpesa");
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="MZN">MZN</option>
              <option value="ZAR">ZAR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Valor</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Método</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {methods.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Nome do Cliente</label>
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email do Cliente</label>
          <input
            type="email"
            required
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        {method !== "visa_mastercard" && method !== "payfast" && (
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
          disabled={submitting}
          className="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "A processar…" : "Testar Cobrança"}
        </button>
      </form>

      {result && (
        <div className="mt-4 rounded-xl bg-slate-900 p-4">
          <pre className="overflow-x-auto text-xs text-emerald-300">
            {JSON.stringify(result, null, 2)}
          </pre>
          {(result.result as { checkout_url?: string })?.checkout_url && (
            <a
              href={(result.result as { checkout_url: string }).checkout_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-brand-300 underline"
            >
              Abrir checkout_url
            </a>
          )}
        </div>
      )}
    </div>
  );
}
