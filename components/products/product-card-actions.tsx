"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductCardActions({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);

  function getLink() {
    return `${window.location.origin}/p/${slug}`;
  }

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(getLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const link = getLink();
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Confira "${title}" na PayNow:`, url: link });
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors",
          copied ? "bg-emerald-600" : "bg-emerald-500 hover:bg-emerald-600"
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copiado!" : "Copiar Link"}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Share2 className="h-3.5 w-3.5" />
        Partilhar
      </button>
    </div>
  );
}
