import { useEffect, useState, type FormEvent } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/DashboardLayout";

export function Settings() {
  const { merchant } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState<"MZN" | "ZAR">("MZN");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!merchant) return;
    setBusinessName(merchant.businessName ?? "");
    setPhone(merchant.phone ?? "");
    setCurrency(merchant.currency ?? "MZN");
  }, [merchant]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const updateMerchantProfile = httpsCallable(functions, "updateMerchantProfile");
      await updateMerchantProfile({ businessName, phone, currency });
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-brand-900">Definições</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-slate-700">Nome do Negócio</label>
          <input
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Telefone</label>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+258841234567"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Moeda Principal</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "MZN" | "ZAR")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="MZN">MZN — Metical</option>
            <option value="ZAR">ZAR — Rand</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Perfil atualizado.</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-500 px-5 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "A guardar…" : "Guardar"}
        </button>
      </form>
    </DashboardLayout>
  );
}
