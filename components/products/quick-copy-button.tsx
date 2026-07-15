"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function QuickCopyButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Copiar link de vendas"
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:text-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
