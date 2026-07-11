"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { uploadCoverImage, uploadProductFile, type UploadedFile } from "@/lib/upload";
import { upsertProduct } from "@/lib/actions/products";
import { slugify } from "@/lib/utils";
import type { Category, Product, ProductFile } from "@/types/database";

export function ProductForm({
  userId,
  categories,
  product,
  existingFiles,
}: {
  userId: string;
  categories: Category[];
  product?: Product;
  existingFiles?: ProductFile[];
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
  const [seoTitle, setSeoTitle] = useState(product?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(product?.seo_description ?? "");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(product?.cover_image_url ?? null);
  const [files, setFiles] = useState<UploadedFile[]>(
    existingFiles?.map((f) => ({ name: f.name, storage_path: f.storage_path, size_bytes: f.size_bytes })) ?? []
  );
  const [uploadingFiles, setUploadingFiles] = useState(false);

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
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
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
              <Label htmlFor="price">Preço</Label>
              <Input
                id="price"
                type="number"
                min="1"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="promo">Preço Promocional</Label>
              <Input
                id="promo"
                type="number"
                min="0"
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
            Entregues automaticamente por download após o pagamento confirmado.
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-primary">
            <Upload className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {uploadingFiles ? "A enviar…" : "Adicionar Ficheiros"}
            </span>
            <input type="file" multiple className="hidden" onChange={handleFilesChange} />
          </label>
          {files.length > 0 && (
            <ul className="mt-4 space-y-2">
              {files.map((f, i) => (
                <li key={f.storage_path} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive"
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "A guardar…" : product ? "Guardar Alterações" : "Enviar para Aprovação"}
        </Button>
      </div>
    </form>
  );
}
