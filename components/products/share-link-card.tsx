"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Share2, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareLinkCard({ productTitle, slug }: { productTitle: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [link, setLink] = useState(`/p/${slug}`);

  useEffect(() => {
    const fullLink = `${window.location.origin}/p/${slug}`;
    setLink(fullLink);
    setCanShare(typeof navigator.share === "function");
    QRCode.toDataURL(fullLink, { width: 200, margin: 1, color: { dark: "#2563EB", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [slug]);

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await navigator.share({
        title: productTitle,
        text: `Confira "${productTitle}" na PayNow:`,
        url: link,
      });
    } catch {
      // user cancelled the native share sheet — no-op
    }
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Share2 className="h-4 w-4 text-primary" />
          O seu link de vendas
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Partilhe este link nas redes sociais, WhatsApp ou onde preferir. Toda venda feita por ele conta para si.
        </p>

        <div className="mt-4 flex gap-2">
          <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {canShare && (
            <Button type="button" size="sm" onClick={handleShare} className="gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Partilhar
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setShowQr((v) => !v)} className="gap-1.5">
            <QrCode className="h-3.5 w-3.5" /> {showQr ? "Ocultar QR" : "Ver código QR"}
          </Button>
        </div>

        {showQr && qrDataUrl && (
          <div className="mt-4 flex justify-center rounded-xl border border-border bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Código QR do link de vendas" className="h-40 w-40" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
