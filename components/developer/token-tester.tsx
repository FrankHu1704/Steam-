"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAccessToken } from "@/lib/actions/developer";

function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado.");
}

export function TokenTester() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ accessToken: string; expiresAt: Date } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await getAccessToken(clientId, clientSecret);
    setPending(false);
    if (res.error || !res.accessToken) {
      toast.error(res.error ?? "Falha ao obter o token.");
      return;
    }
    setResult({
      accessToken: res.accessToken,
      expiresAt: new Date(Date.now() + (res.expiresIn ?? 3600) * 1000),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="token-client-id">client_id</Label>
          <Input
            id="token-client-id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="pgj_id_..."
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="token-client-secret">client_secret</Label>
          <Input
            id="token-client-secret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="pgj_test_... ou pgj_live_..."
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="gap-1.5">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Obter token de acesso
      </Button>

      {result && (
        <div className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">
            Token obtido — expira às {result.expiresAt.toLocaleTimeString("pt-MZ")}.
          </p>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2 font-mono text-xs">
            <span className="truncate">{result.accessToken}</span>
            <button type="button" onClick={() => copy(result.accessToken)}>
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use nos outros pedidos: <code>Authorization: Bearer {"{token}"}</code>
          </p>
        </div>
      )}
    </form>
  );
}
