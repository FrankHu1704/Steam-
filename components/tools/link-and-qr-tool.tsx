"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ProductOption {
  id: string;
  title: string;
  slug: string;
}

export function LinkAndQrTool({ products }: { products: ProductOption[] }) {
  const [productSlug, setProductSlug] = useState(products[0]?.slug ?? "");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSiteUrl(window.location.origin);
  }, []);

  const link = (() => {
    if (!productSlug || !siteUrl) return "";
    const url = new URL(`${siteUrl}/p/${productSlug}`);
    if (utmSource) url.searchParams.set("utm_source", utmSource);
    if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
    if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
    return url.toString();
  })();

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 220, margin: 1, color: { dark: "#2563EB", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [link]);

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Crie um produto primeiro para gerar links e QR codes.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-3">
        <div>
          <Label htmlFor="product">Produto</Label>
          <Select id="product" value={productSlug} onChange={(e) => setProductSlug(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="utmSource">Origem</Label>
            <Input id="utmSource" placeholder="instagram" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="utmMedium">Meio</Label>
            <Input id="utmMedium" placeholder="bio" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="utmCampaign">Campanha</Label>
            <Input id="utmCampaign" placeholder="lancamento" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Link</Label>
          <div className="flex gap-2">
            <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-white p-4">
        {qrDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Código QR" className="h-40 w-40" />
            <a href={qrDataUrl} download={`pagaja-qr-${productSlug}.png`}>
              <Button type="button" variant="outline" size="sm">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Descarregar
              </Button>
            </a>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">A gerar...</p>
        )}
      </div>
    </div>
  );
}
