"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { saveFacebookCapiToken, removeFacebookCapiToken } from "@/lib/actions/facebook-capi";

export function PixelCapiTokenField({
  productId,
  initiallyConfigured,
}: {
  productId: string;
  initiallyConfigured: boolean;
}) {
  const [configured, setConfigured] = useState(initiallyConfigured);
  const [editing, setEditing] = useState(!initiallyConfigured);
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    const result = await saveFacebookCapiToken(productId, token);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Token guardado.");
    setConfigured(true);
    setEditing(false);
    setToken("");
  }

  async function handleRemove() {
    setPending(true);
    const result = await removeFacebookCapiToken(productId);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Token removido.");
    setConfigured(false);
    setEditing(true);
  }

  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <Label htmlFor="fbCapiToken">Facebook Access Token (API de Conversões)</Label>
      <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
        Envia o evento &quot;Compra&quot; também pelo servidor, confirmado pela PagaJá — não só pelo navegador do
        cliente — para o Facebook aprender melhor quem realmente compra e atrair mais pessoas parecidas. Gere em
        Gestor de Eventos → esta fonte de dados → API de Conversões → Gerar token de acesso.
      </p>
      {configured && !editing ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Token configurado
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium underline">
              Substituir
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="text-xs font-medium text-destructive underline"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            id="fbCapiToken"
            type="password"
            autoComplete="off"
            placeholder="EAAxxxxxxxxxxxxx"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono text-xs"
          />
          <Button type="button" size="sm" onClick={handleSave} disabled={pending || !token.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      )}
    </div>
  );
}
