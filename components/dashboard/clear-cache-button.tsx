"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ClearCacheButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!confirm("Isto limpa a cache local e reinicia a aplicação neste dispositivo. Continuar?")) return;
    setPending(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Cache limpa. A recarregar…");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("Falha ao limpar a cache.");
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending} className="w-full">
      {pending ? "A limpar…" : "Limpar Dados Locais"}
    </Button>
  );
}
