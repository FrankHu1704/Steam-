"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, X, FileText, Link2, ImageOff, Loader2, Sparkles, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { uploadCoverImage, uploadProductFile, type UploadedFile } from "@/lib/upload";
import { upsertPaymentLink, generatePaymentLinkCopy } from "@/lib/actions/payment-links";
import { slugify, cn } from "@/lib/utils";
import { CHECKOUT_ACCENT_COLORS, MAX_HIGHLIGHT_TEXT_LENGTH, type CheckoutAccentColorKey } from "@/lib/checkout-theme";
import type { Product, ProductFile } from "@/types/database";

export function PaymentLinkForm({
  userId,
  currency,
  product,
  existingFile,
}: {
  userId: string;
  currency: "MZN" | "ZAR";
  product?: Product;
  existingFile?: ProductFile | null;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price ? String(product.price) : "");
  const [accentColor, setAccentColor] = useState<CheckoutAccentColorKey | null>(
    (product?.checkout_accent_color as CheckoutAccentColorKey | null) ?? null
  );
  const [highlightText, setHighlightText] = useState(product?.checkout_highlight_text ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(product?.cover_image_url ?? null);
  const [file, setFile] = useState<UploadedFile | null>(
    existingFile
      ? {
          name: existingFile.name,
          storage_path: existingFile.storage_path,
          external_url: existingFile.external_url,
          size_bytes: existingFile.size_bytes,
        }
      : null
  );
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const [lunaPrompt, setLunaPrompt] = useState("");
  const [lunaGenerating, setLunaGenerating] = useState(false);
  const [lunaError, setLunaError] = useState<string | null>(null);
  const [lunaApplied, setLunaApplied] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setUploadingFile(true);
    setError(null);
    try {
      const slug = slugify(title || "link-pagamento");
      const uploaded = await uploadProductFile(userId, slug, picked);
      setFile(uploaded);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingFile(false);
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
    setFile({ name: "Link de acesso", storage_path: null, external_url: normalizedUrl, size_bytes: 0 });
    setLinkUrl("");
    setShowLinkForm(false);
    setError(null);
  }

  async function handleGenerateWithLuna() {
    if (!lunaPrompt.trim()) {
      setLunaError("Descreva o que está a vender.");
      return;
    }
    setLunaGenerating(true);
    setLunaError(null);
    setLunaApplied(false);
    const res = await generatePaymentLinkCopy(lunaPrompt);
    setLunaGenerating(false);
    if (res.error || !res.result) {
      setLunaError(res.error ?? "Não foi possível gerar o texto.");
      return;
    }
    setTitle(res.result.title);
    setDescription(res.result.description);
    setHighlightText(res.result.highlightText);
    setLunaApplied(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Anexe um ficheiro ou link antes de continuar.");
      return;
    }
    if (!coverPreview && !coverFile) {
      setError("Carregue uma imagem de capa antes de continuar.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let coverImageUrl = coverPreview;
      if (coverFile) {
        coverImageUrl = await uploadCoverImage(userId, coverFile);
      }

      const res = await upsertPaymentLink({
        id: product?.id,
        title,
        description,
        price: Number(price),
        currency,
        coverImageUrl,
        file,
        accentColor,
        highlightText: highlightText || null,
      });

      if (res.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }

      toast.success("Link de pagamento enviado para aprovação.");
      router.push("/dashboard/products");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="font-semibold">Personalizar com LunaAI</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Descreva com as suas palavras o que está a vender — a LunaAI escreve o título, a descrição e uma frase de
            destaque para a página de pagamento. Pode editar tudo antes de guardar.
          </p>
          <Textarea
            placeholder="Ex: uma mentoria de 4 semanas sobre marketing digital para iniciantes, com aulas ao vivo toda semana..."
            value={lunaPrompt}
            onChange={(e) => setLunaPrompt(e.target.value)}
            rows={3}
          />
          {lunaError && <p className="text-sm text-destructive">{lunaError}</p>}
          <Button type="button" variant="outline" onClick={handleGenerateWithLuna} disabled={lunaGenerating}>
            {lunaGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Gerar com LunaAI
          </Button>
          {lunaApplied && (
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Aplicado abaixo — reveja e edite à vontade.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              required
              placeholder="Ex: Doação mensal, Curso online..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="O que o comprador vai receber..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Valor ({currency})</Label>
            <Input
              id="price"
              type="number"
              min={50}
              step="0.01"
              required
              placeholder="Mínimo 50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="highlight">Frase de destaque acima do botão (opcional)</Label>
            <Input
              id="highlight"
              placeholder="Ex: Garantia de 7 dias · Acesso imediato"
              maxLength={MAX_HIGHLIGHT_TEXT_LENGTH}
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cor de destaque (opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CHECKOUT_ACCENT_COLORS) as [CheckoutAccentColorKey, string][]).map(([key, hex]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAccentColor(accentColor === key ? null : key)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                    accentColor === key ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: hex }}
                  aria-label={key}
                >
                  {accentColor === key && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Imagem de capa</Label>
            {coverPreview ? (
              <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                  }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40">
                <ImageOff className="h-5 w-5" />
                <span className="text-xs">Carregar</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (!picked) return;
                    setCoverFile(picked);
                    setCoverPreview(URL.createObjectURL(picked));
                  }}
                />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Anexo (ficheiro ou link)</Label>
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {file.external_url ? <Link2 className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{file.name}</span>
                </span>
                <button type="button" onClick={() => setFile(null)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : showLinkForm ? (
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleAddLink}>
                  Adicionar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowLinkForm(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-2.5 text-sm text-muted-foreground hover:border-primary/40">
                  {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Carregar anexo
                  <input type="file" className="hidden" onChange={handleFileChange} disabled={uploadingFile} />
                </label>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowLinkForm(true)}>
                  <Link2 className="mr-1.5 h-3.5 w-3.5" /> Usar link
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Entregue ao comprador só depois de o pagamento ser confirmado.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting || uploadingFile}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {product ? "Guardar alterações" : "Criar link de pagamento"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
