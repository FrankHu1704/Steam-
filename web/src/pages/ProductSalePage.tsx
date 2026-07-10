import { useEffect, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { PRODUCT_TYPES, type ProductType } from "../lib/productTypes";

interface ProductDoc {
  merchantId: string;
  type: ProductType;
  name: string;
  description: string;
  price: number;
  currency: "MZN" | "ZAR";
  coverImageUrl: string | null;
  previewImageUrls: string[];
  status: string;
  active: boolean;
}

const METHODS_MZN = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "emola", label: "e-Mola" },
  { value: "mkesh", label: "mKesh" },
  { value: "visa_mastercard", label: "Visa / Mastercard" },
];
const METHODS_ZAR = [{ value: "payfast", label: "PayFast (Cartão/EFT)" }];

export function ProductSalePage() {
  const { productId } = useParams<{ productId: string }>();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref") ?? undefined;

  const [product, setProduct] = useState<ProductDoc | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [method, setMethod] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<{ name: string; url: string }[] | null>(null);

  useEffect(() => {
    if (!productId) return;
    return onSnapshot(doc(db, "products", productId), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      setProduct(snap.data() as ProductDoc);
    });
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    const registerProductView = httpsCallable(functions, "registerProductView");
    registerProductView({ productId, ref }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (!paymentId || paymentStatus === "success" || paymentStatus === "failed") return;
    const checkPaymentStatus = httpsCallable(functions, "checkPaymentStatus");
    const interval = setInterval(async () => {
      const res = await checkPaymentStatus({ paymentId });
      const status = (res.data as { status: string }).status;
      setPaymentStatus(status);
    }, 4000);
    return () => clearInterval(interval);
  }, [paymentId, paymentStatus]);

  useEffect(() => {
    if (paymentStatus !== "success" || !paymentId) return;
    const getProductDownload = httpsCallable(functions, "getProductDownload");
    getProductDownload({ paymentId }).then((res) => {
      setDownloads((res.data as { files: { name: string; url: string }[] }).files);
    });
  }, [paymentStatus, paymentId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const purchaseProduct = httpsCallable(functions, "purchaseProduct");
      const res = await purchaseProduct({
        productId,
        paymentMethod: method,
        customerName,
        customerEmail,
        customerPhone,
        returnUrl: window.location.href,
        ref,
      });
      const data = res.data as {
        paymentId: string;
        status: string;
        checkoutUrl: string | null;
      };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setPaymentId(data.paymentId);
      setPaymentStatus(data.status);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Produto não encontrado.
      </div>
    );
  }
  if (!product) {
    return <div className="flex h-screen items-center justify-center text-slate-500">A carregar…</div>;
  }
  if (product.status !== "approved" || !product.active) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-brand-900">Produto indisponível</h1>
        <p className="mt-2 text-slate-500">Este produto não está disponível para venda no momento.</p>
      </div>
    );
  }

  if (paymentId && paymentStatus === "success") {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-emerald-700">Pagamento confirmado ✅</h1>
        <p className="mt-2 text-slate-500">Obrigado pela compra de {product.name}.</p>
        {downloads === null ? (
          <p className="mt-6 text-sm text-slate-400">A preparar os seus ficheiros…</p>
        ) : downloads.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {downloads.map((f) => (
              <li key={f.url}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg bg-brand-50 px-4 py-2.5 font-semibold text-brand-700 hover:bg-brand-100"
                >
                  Baixar {f.name}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (paymentId && (paymentStatus === "pending" || paymentStatus === "awaiting_customer")) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-brand-900">A aguardar confirmação…</h1>
        <p className="mt-2 text-slate-500">Confirme o pagamento no seu telefone (M-Pesa/e-Mola/mKesh).</p>
      </div>
    );
  }

  if (paymentId && paymentStatus === "failed") {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-red-600">Pagamento falhou</h1>
        <button
          onClick={() => {
            setPaymentId(null);
            setPaymentStatus(null);
          }}
          className="mt-4 rounded-lg bg-brand-500 px-5 py-2 font-semibold text-white"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const methods = product.currency === "ZAR" ? METHODS_ZAR : METHODS_MZN;
  const typeInfo = PRODUCT_TYPES.find((t) => t.value === product.type);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {product.coverImageUrl && (
        <img src={product.coverImageUrl} alt={product.name} className="w-full rounded-xl object-cover" />
      )}
      <p className="mt-4 text-xs font-semibold uppercase text-brand-500">{typeInfo?.label}</p>
      <h1 className="text-2xl font-bold text-brand-900">{product.name}</h1>
      <p className="mt-2 whitespace-pre-line text-slate-600">{product.description}</p>
      <p className="mt-4 text-3xl font-bold text-brand-900">
        {product.price.toFixed(2)} {product.currency}
      </p>

      {product.previewImageUrls.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {product.previewImageUrls.map((url) => (
            <img key={url} src={url} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl bg-white p-6 shadow-sm">
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
          {submitting ? "A processar…" : "Comprar Agora"}
        </button>
      </form>
    </div>
  );
}
