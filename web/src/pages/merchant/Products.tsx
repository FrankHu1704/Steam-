import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { uploadProductImage } from "../../lib/uploadProductImage";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/DashboardLayout";
import { StatusBadge } from "../../components/StatusBadge";

interface ProductRow {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  status: string;
  rejectionReason: string | null;
}

export function Products() {
  const { merchant } = useAuth();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"MZN" | "ZAR">("MZN");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function onImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!merchant) return;
    setError(null);
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadProductImage(merchant.uid, imageFile);
      }
      const createProduct = httpsCallable(functions, "createProduct");
      await createProduct({ name, description, price: Number(price), currency, imageUrl });
      setName("");
      setDescription("");
      setPrice("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-brand-900">Produtos</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 rounded-xl bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Nome</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Preço</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "MZN" | "ZAR")}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="MZN">MZN</option>
              <option value="ZAR">ZAR</option>
            </select>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Foto do Produto (opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-600"
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Pré-visualização"
              className="mt-3 h-24 w-24 rounded-lg border border-slate-200 object-cover"
            />
          )}
        </div>
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-500 px-5 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? "A enviar…" : "Submeter para Aprovação"}
          </button>
        </div>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Ainda sem produtos.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-slate-500">{p.description}</p>
                      {p.status === "rejected" && p.rejectionReason && (
                        <p className="mt-1 text-xs text-red-600">Motivo: {p.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">
                  {p.price.toFixed(2)} {p.currency}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
