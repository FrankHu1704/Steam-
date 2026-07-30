"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, X, Facebook, Music2, ChartLine, Link2, FileText, PackagePlus, ImageOff, Loader2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { uploadCoverImage, uploadProductFile, type UploadedFile } from "@/lib/upload";
import { upsertProduct, setBumpOffers, setUpsellOffer } from "@/lib/actions/products";
import { slugify, formatCurrency } from "@/lib/utils";
import type { Category, Product, ProductFile } from "@/types/database";
import type { UpsellOffer } from "@/lib/data/products";

function BumpOffersPicker({ productId, candidates, initialSelectedIds }: { productId: string; candidates: Product[]; initialSelectedIds: string[] }) {
  const [selected, setSelected] = useState<string[]>(initialSelectedIds);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((i) => i !== id) : [...selected, id];
    setSelected(next);
    setSavingId(id);
    await setBumpOffers(productId, next);
    setSavingId(null);
  }

  if (candidates.length === 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Não tem outros produtos aprovados para oferecer como order bump.
      </p>
    );
  }

  return (
    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
      {candidates.map((c) => (
        <label
          key={c.id}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-2.5 text-sm hover:border-primary/40"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {c.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.cover_image_url} alt={c.title} className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{c.title}</span>
              <span className="block text-xs text-muted-foreground">
                {formatCurrency(c.promo_price ?? c.price, c.currency as "MZN" | "ZAR")}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {savingId === c.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary"
              checked={selected.includes(c.id)}
              onChange={() => toggle(c.id)}
              disabled={savingId === c.id}
            />
          </span>
        </label>
      ))}
    </div>
  );
}

function UpsellPicker({
  productId,
  candidates,
  initialOffer,
}: {
  productId: string;
  candidates: Product[];
  initialOffer: UpsellOffer | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialOffer?.upsellProductId ?? null);
  const [customPrice, setCustomPrice] = useState(initialOffer?.customPrice != null ? String(initialOffer.customPrice) : "");
  const [saving, setSaving] = useState(false);

  async function save(nextId: string | null, nextPrice: string) {
    setSaving(true);
    await setUpsellOffer(productId, nextId, nextPrice ? Number(nextPrice) : null);
    setSaving(false);
  }

  function handleSelect(id: string) {
    const nextId = selectedId === id ? null : id;
    setSelectedId(nextId);
    void save(nextId, customPrice);
  }

  if (candidates.length === 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Não tem outros produtos aprovados para oferecer como upsell.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {candidates.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-2.5 text-sm hover:border-primary/40"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {c.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover_image_url} alt={c.title} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatCurrency(c.promo_price ?? c.price, c.currency as "MZN" | "ZAR")}
                </span>
              </span>
            </span>
            <input
              type="radio"
              className="h-4 w-4 border-border text-primary"
              checked={selectedId === c.id}
              onChange={() => handleSelect(c.id)}
              disabled={saving}
            />
          </label>
        ))}
      </div>
      {selectedId && (
        <div>
          <Label htmlFor="upsellPrice">Preço especial do upsell (opcional)</Label>
          <Input
            id="upsellPrice"
            type="number"
            min="0"
            placeholder="Deixe em branco para usar o preço normal"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            onBlur={() => void save(selectedId, customPrice)}
          />
        </div>
      )}
    </div>
  );
}

export function ProductForm({
  userId,
  categories,
  product,
  existingFiles,
  bumpCandidates,
  bumpOfferIds,
  upsellOffer,
}: {
  userId: string;
  categories: Category[];
  product?: Product;
  existingFiles?: ProductFile[];
  bumpCandidates?: Product[];
  bumpOfferIds?: string[];
  upsellOffer?: UpsellOffer | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(product?.title ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [promoPrice, setPromoPrice] = useState(product?.promo_price ? String(product.promo_price) : "");
  const [currency, setCurrency] = useState<"MZN" | "ZAR">((product?.currency as "MZN" | "ZAR") ?? "MZN");
  const [videoUrl, setVideoUrl] = useState(product?.video_url ?? "");
  const [affiliateEnabled, setAffiliateEnabled] = useState(product?.affiliate_enabled ?? false);
  const [commissionPercent, setCommissionPercent] = useState(
    String(product?.affiliate_commission_percent ?? 20)
  );
  const [bumpEnabled, setBumpEnabled] = useState(product?.bump_enabled ?? false);
  const [seoTitle, setSeoTitle] = useState(product?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seo_description ?? "");
  const [trackingScript, setTrackingScript] = useState(product?.tracking_script ?? "");
  const [facebookPixelId, setFacebookPixelId] = useState(product?.facebook_pixel_id ?? "");
  const [tiktokPixelId, setTiktokPixelId] = useState(product?.tiktok_pixel_id ?? "");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(product?.google_analytics_id ?? "");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(product?.cover_image_url ?? null);
  const [files, setFiles] = useState<UploadedFile[]>(
    existingFiles?.map((f) => ({
      name: f.name,
      storage_path: f.storage_path,
      external_url: f.external_url,
      size_bytes: f.size_bytes,
    })) ?? []
  );
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setUploadingFiles(true);
    setError(null);
    try {
      const slug = slugify(title || "produto");
      const uploaded = await Promise.all(picked.map((f) => uploadProductFile(userId, slug, f)));
      setFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingFiles(false);
      e.target.value = "";
    }
  }

  function handleAddLink() {
    const url = linkUrl.trim();
    if (!url) return;
    let normalizedUrl = url;
    try {
      normalizedUrl = new URL(url).toString();
    } catch {
      setError("Indique um link válido (com https://).");
      return;
    }
    setFiles((prev) => [
      ...prev,
      { name: linkName.trim() || "Link de acesso", storage_path: null, external_url: normalizedUrl, size_bytes: 0 },
    ]);
    setLinkName("");
    setLinkUrl("");
    setShowLinkForm(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let coverImageUrl = coverPreview;
      if (coverFile) {
        coverImageUrl = await uploadCoverImage(userId, coverFile);
      }
      if (!coverImageUrl) {
        setError("A capa do produto é obrigatória.");
        setSubmitting(false);
        return;
      }

      const res = await upsertProduct({
        id: product?.id,
        categoryId,
        title,
        description,
        price: Number(price),
        promoPrice: promoPrice ? Number(promoPrice) : null,
        currency,
        coverImageUrl,
        videoUrl: videoUrl || null,
        affiliateEnabled,
        affiliateCommissionPercent: Number(commissionPercent),
        bumpEnabled,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        trackingScript: trackingScript || null,
        facebookPixelId: facebookPixelId || null,
        tiktokPixelId: tiktokPixelId || null,
        googleAnalyticsId: googleAnalyticsId || null,
        files,
      });

      if (res.error) {
        setError(res.error);
      } else {
        toast.success(product ? "Produto atualizado — voltou para revisão." : "Produto criado — aguardando aprovação.");
        router.push("/dashboard/products");
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Dados do Produto</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="video">Vídeo de Apresentação (URL, opcional)</Label>
              <Input
                id="video"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Preço</h2>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">Preço (mínimo 50 MT)</Label>
              <Input
                id="price"
                type="number"
                min="50"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="promo">Preço Promocional (mín. 50 MT)</Label>
              <Input
                id="promo"
                type="number"
                min="50"
                step="0.01"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="currency">Moeda</Label>
              <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value as "MZN" | "ZAR")}>
                <option value="MZN">MZN</option>
                <option value="ZAR">ZAR</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Ficheiros do Produto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Entregues automaticamente após o pagamento confirmado — envie ficheiros (PDF, ZIP, etc.) ou adicione um
            link (Google Drive, área de membros, grupo do WhatsApp/Telegram...).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-primary">
              <Upload className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {uploadingFiles ? "A enviar…" : "Adicionar Ficheiros"}
              </span>
              <input type="file" multiple className="hidden" onChange={handleFilesChange} />
            </label>
            <button
              type="button"
              onClick={() => setShowLinkForm((v) => !v)}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-primary"
            >
              <Link2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary">Adicionar Link</span>
            </button>
          </div>
          {showLinkForm && (
            <div className="mt-3 space-y-3 rounded-xl border border-border p-4">
              <div>
                <Label htmlFor="linkName">Nome (opcional)</Label>
                <Input
                  id="linkName"
                  placeholder="Ex: Acesso ao curso"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="linkUrl">Link</Label>
                <Input
                  id="linkUrl"
                  placeholder="https://drive.google.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              <Button type="button" variant="secondary" onClick={handleAddLink}>
                Adicionar
              </Button>
            </div>
          )}
          {files.length > 0 && (
            <ul className="mt-4 space-y-2">
              {files.map((f, i) => (
                <li
                  key={`${f.storage_path ?? f.external_url}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {f.external_url ? (
                      <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{f.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">SEO</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="seoTitle">Título SEO</Label>
              <Input id="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="seoDescription">Meta Descrição</Label>
              <Textarea id="seoDescription" rows={2} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Rastreamento & Conversão (Pixels)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opcional — nenhum campo aqui é obrigatório. Preencha só os que usar para medir as suas campanhas.
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1877F2]/10 text-[#1877F2]">
                <Facebook className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <Label htmlFor="fbPixel">Facebook Pixel</Label>
                <Input
                  id="fbPixel"
                  placeholder="Ex: 123456789012345"
                  value={facebookPixelId}
                  onChange={(e) => setFacebookPixelId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-foreground">
                <Music2 className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <Label htmlFor="tiktokPixel">TikTok Pixel</Label>
                <Input
                  id="tiktokPixel"
                  placeholder="Ex: ABCDEF123"
                  value={tiktokPixelId}
                  onChange={(e) => setTiktokPixelId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <ChartLine className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <Label htmlFor="gaId">Google Analytics</Label>
                <Input
                  id="gaId"
                  placeholder="Ex: G-XXXXXXXXXX"
                  value={googleAnalyticsId}
                  onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="trackingScript">Script personalizado (avançado, opcional)</Label>
            <p className="mb-2 text-xs text-muted-foreground">Para UTMify ou outra ferramenta não listada acima.</p>
            <Textarea
              id="trackingScript"
              rows={4}
              placeholder="<script>...</script>"
              className="font-mono text-xs"
              value={trackingScript}
              onChange={(e) => setTrackingScript(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Capa</h2>
          <label className="mt-4 flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-border hover:border-primary">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="Capa" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-primary">Adicionar capa</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setCoverFile(file);
                  setCoverPreview(URL.createObjectURL(file));
                }
              }}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Afiliação</h2>
              <p className="text-xs text-muted-foreground">Outros podem promover e ganhar comissão.</p>
            </div>
            <Switch checked={affiliateEnabled} onChange={(e) => setAffiliateEnabled(e.target.checked)} />
          </div>
          {affiliateEnabled && (
            <div className="mt-4">
              <Label htmlFor="commission">Comissão (%)</Label>
              <Input
                id="commission"
                type="number"
                min="1"
                max="90"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-1.5 font-semibold">
                <PackagePlus className="h-4 w-4" /> Order Bump
              </h2>
              <p className="text-xs text-muted-foreground">Ofereça outro produto seu no checkout.</p>
            </div>
            <Switch checked={bumpEnabled} onChange={(e) => setBumpEnabled(e.target.checked)} />
          </div>
          {bumpEnabled && (
            <>
              {product?.id ? (
                <BumpOffersPicker
                  productId={product.id}
                  candidates={bumpCandidates ?? []}
                  initialSelectedIds={bumpOfferIds ?? []}
                />
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Guarde o produto primeiro para escolher quais produtos aparecem como order bump.
                </p>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Zap className="h-4 w-4" /> Upsell pós-compra
          </h2>
          <p className="text-xs text-muted-foreground">
            Depois de pagar, o comprador vê uma oferta para levar também este produto com um clique.
          </p>
          {product?.id ? (
            <UpsellPicker productId={product.id} candidates={bumpCandidates ?? []} initialOffer={upsellOffer ?? null} />
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Guarde o produto primeiro para escolher o upsell.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "A guardar…" : product ? "Guardar Alterações" : "Enviar para Aprovação"}
        </Button>
      </div>
    </form>
  );
}
