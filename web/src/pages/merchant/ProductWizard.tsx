import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { doc, collection } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components/DashboardLayout";
import { uploadProductImage } from "../../lib/uploadProductImage";
import { uploadProductFile, type UploadedProductFile } from "../../lib/uploadProductFile";
import {
  PRODUCT_TYPES,
  MAX_PRODUCT_FILES,
  MAX_PREVIEW_IMAGES,
  type ProductType,
} from "../../lib/productTypes";

const STEPS = ["Tipo", "Dados", "Ficheiros", "Capa e Previews", "Afiliação", "Revisão"];

export function ProductWizard() {
  const { merchant } = useAuth();
  const navigate = useNavigate();

  // Minted once, up front — Storage paths for private files need a
  // productId before the Firestore doc itself exists.
  const productId = useMemo(() => doc(collection(db, "products")).id, []);

  const [step, setStep] = useState(0);
  const [type, setType] = useState<ProductType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"MZN" | "ZAR">("MZN");

  const [files, setFiles] = useState<UploadedProductFile[]>([]);
  const [filesUploading, setFilesUploading] = useState(false);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewsUploading, setPreviewsUploading] = useState(false);

  const [affiliateEnabled, setAffiliateEnabled] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState("20");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType = PRODUCT_TYPES.find((t) => t.value === type);

  async function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    if (!merchant) return;
    const picked = Array.from(e.target.files ?? []);
    if (files.length + picked.length > MAX_PRODUCT_FILES) {
      setError(`No máximo ${MAX_PRODUCT_FILES} ficheiros.`);
      return;
    }
    setError(null);
    setFilesUploading(true);
    try {
      const uploaded = await Promise.all(
        picked.map((f) => uploadProductFile(merchant.uid, productId, f))
      );
      setFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFilesUploading(false);
      e.target.value = "";
    }
  }

  async function handleCoverChange(e: ChangeEvent<HTMLInputElement>) {
    if (!merchant) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setCoverUploading(true);
    try {
      setCoverUrl(await uploadProductImage(merchant.uid, file));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCoverUploading(false);
    }
  }

  async function handlePreviewsChange(e: ChangeEvent<HTMLInputElement>) {
    if (!merchant) return;
    const picked = Array.from(e.target.files ?? []);
    if (previewUrls.length + picked.length > MAX_PREVIEW_IMAGES) {
      setError(`No máximo ${MAX_PREVIEW_IMAGES} imagens de preview.`);
      return;
    }
    setError(null);
    setPreviewsUploading(true);
    try {
      const uploaded = await Promise.all(picked.map((f) => uploadProductImage(merchant.uid, f)));
      setPreviewUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPreviewsUploading(false);
      e.target.value = "";
    }
  }

  function canAdvance() {
    if (step === 0) return !!type;
    if (step === 1) return !!name && !!price && Number(price) > 0;
    if (step === 2) return !selectedType?.requiresFiles || files.length > 0;
    if (step === 3) return !!coverUrl;
    return true;
  }

  async function handleSubmit() {
    if (!merchant || !type) return;
    setError(null);
    setSubmitting(true);
    try {
      const createProduct = httpsCallable(functions, "createProduct");
      await createProduct({
        productId,
        type,
        name,
        description,
        price: Number(price),
        currency,
        coverImageUrl: coverUrl,
        previewImageUrls: previewUrls,
        files,
        affiliateEnabled,
        affiliateCommissionPercent: Number(commissionPercent),
      });
      navigate("/dashboard/products");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const stepsForType = selectedType?.requiresFiles ? STEPS : STEPS.filter((s) => s !== "Ficheiros");
  const effectiveStep = selectedType?.requiresFiles || step < 2 ? step : step > 2 ? step - 1 : step;

  function next() {
    if (!canAdvance()) return;
    if (step === 1 && !selectedType?.requiresFiles) {
      setStep(3);
    } else {
      setStep((s) => s + 1);
    }
  }
  function back() {
    if (step === 3 && !selectedType?.requiresFiles) {
      setStep(1);
    } else {
      setStep((s) => Math.max(0, s - 1));
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-brand-900">Criar Produto</h1>

      <div className="mt-4 flex gap-2">
        {stepsForType.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full ${
              i <= effectiveStep ? "bg-brand-500" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Tipo de Produto</h2>
            <p className="mt-1 text-sm text-slate-500">
              Primeiro escolha o tipo de produto. No próximo passo adiciona título, descrição e preço.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition ${
                    type === t.value
                      ? "border-brand-500 bg-brand-900 text-white"
                      : "border-slate-200 hover:border-brand-300"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      type === t.value ? "bg-white/15" : "bg-brand-50"
                    }`}
                  >
                    <t.icon
                      className={`h-5 w-5 ${type === t.value ? "text-white" : "text-brand-600"}`}
                    />
                  </span>
                  <span>
                    <p className="font-semibold">{t.label}</p>
                    <p className={`mt-1 text-sm ${type === t.value ? "text-brand-100" : "text-slate-500"}`}>
                      {t.description}
                    </p>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-brand-900">Dados do Produto</h2>
            <p className="text-sm text-slate-500">
              Título, descrição e preço ficam visíveis no link de venda.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700">Título</label>
              <input
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-slate-400">{name.length}/120 caracteres</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Descrição</label>
              <textarea
                value={description}
                maxLength={2000}
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-slate-400">{description.length}/2000 caracteres</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Preço</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
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
          </div>
        )}

        {step === 2 && selectedType?.requiresFiles && (
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Ficheiros do Produto</h2>
            <p className="mt-1 text-sm text-slate-500">
              Envie até {MAX_PRODUCT_FILES} ficheiros, até 40MB cada. Entregues automaticamente
              depois do pagamento confirmado.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand-400">
              <span className="font-semibold text-brand-600">
                {filesUploading ? "A enviar…" : "Adicionar Ficheiros"}
              </span>
              <input type="file" multiple className="hidden" onChange={handleFilesChange} />
            </label>
            {files.length > 0 && (
              <ul className="mt-4 space-y-2">
                {files.map((f) => (
                  <li
                    key={f.path}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>{f.name}</span>
                    <span className="text-slate-400">{(f.sizeBytes / 1024).toFixed(0)} KB</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Capa e Previews</h2>
            <p className="mt-1 text-sm text-slate-500">
              A capa é obrigatória. Previews ajudam o comprador a confiar.
            </p>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Capa do Produto</p>
              <label className="mt-2 flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-400">
                {coverUrl ? (
                  <img src={coverUrl} alt="Capa" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-brand-600">
                    {coverUploading ? "A enviar…" : "Adicionar capa (até 5MB)"}
                  </span>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </label>
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase text-slate-500">Previews (opcional)</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {previewUrls.map((url) => (
                  <img key={url} src={url} className="h-20 w-20 rounded-lg object-cover" />
                ))}
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-2xl text-slate-400 hover:border-brand-400">
                  {previewsUploading ? "…" : "+"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePreviewsChange}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Afiliação</h2>
            <p className="mt-1 text-sm text-slate-500">
              Outros merchants podem promover este produto e ganhar comissão por venda.
            </p>
            <label className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span>
                <span className="block font-medium">Ativar programa de afiliados</span>
                <span className="block text-sm text-slate-500">
                  Qualquer merchant pode gerar um link e promover o seu produto
                </span>
              </span>
              <input
                type="checkbox"
                checked={affiliateEnabled}
                onChange={(e) => setAffiliateEnabled(e.target.checked)}
                className="h-6 w-11 shrink-0 appearance-none rounded-full bg-slate-300 checked:bg-brand-500 relative transition before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition checked:before:translate-x-5"
              />
            </label>
            {affiliateEnabled && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700">
                  Comissão por venda (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Revisão</h2>
            <div className="mt-4 flex gap-4">
              {coverUrl && <img src={coverUrl} className="h-24 w-24 rounded-lg object-cover" />}
              <div>
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-slate-500">{selectedType?.label}</p>
                <p className="mt-1 font-medium">
                  {Number(price || 0).toFixed(2)} {currency}
                </p>
              </div>
            </div>
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-100 py-2">
                <dt className="text-slate-500">Ficheiros</dt>
                <dd>{files.length}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-2">
                <dt className="text-slate-500">Previews</dt>
                <dd>{previewUrls.length}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-2">
                <dt className="text-slate-500">Afiliação</dt>
                <dd>{affiliateEnabled ? `Ativa (${commissionPercent}%)` : "Desativada"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-slate-500">
              O produto fica visível para venda só depois da aprovação de um administrador.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="rounded-lg border border-slate-300 px-5 py-2 font-semibold text-slate-700 disabled:opacity-40"
          >
            Voltar
          </button>
          {step < 5 ? (
            <button
              onClick={next}
              disabled={!canAdvance()}
              className="rounded-lg bg-brand-500 px-6 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              Próximo
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-brand-500 px-6 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? "A enviar…" : "Enviar para Análise"}
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
