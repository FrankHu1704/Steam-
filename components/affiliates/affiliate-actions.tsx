"use client";

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { becomeAffiliate } from "@/lib/actions/affiliates";

export function BecomeAffiliateButton({ productId, slug }: { productId: string; slug: string }) {
  const [pending, setPending] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await becomeAffiliate(productId);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLink(`${window.location.origin}/p/${slug}?ref=${result.code}`);
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (link) {
    return (
      <Button type="button" size="sm" variant="outline" className="w-full" onClick={handleCopy}>
        {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
        {copied ? "Copiado!" : "Copiar link"}
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <Button type="button" size="sm" className="w-full" onClick={handleClick} disabled={pending}>
        {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Tornar-me afiliado
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
