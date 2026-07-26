"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, Trash2, Webhook } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createApiKey,
  revokeApiKey,
  saveDeveloperWebhook,
  deleteDeveloperWebhook,
} from "@/lib/actions/developer";
import type { ApiKey, DeveloperWebhook } from "@/types/database";

function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado.");
}

export function DeveloperApiPanel({
  apiKeys,
  webhook,
  baseUrl,
}: {
  apiKeys: ApiKey[];
  webhook: DeveloperWebhook | null;
  baseUrl: string;
}) {
  const [keys, setKeys] = useState(apiKeys);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<{ clientId: string; clientSecret: string } | null>(null);

  const [webhookUrl, setWebhookUrl] = useState(webhook?.url ?? "");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<string | null>(null);
  const [hasWebhook, setHasWebhook] = useState(!!webhook);

  async function handleCreateKey() {
    setCreating(true);
    const res = await createApiKey(label);
    setCreating(false);
    if (res.error || !res.id || !res.clientId || !res.clientSecret) {
      toast.error(res.error ?? "Falha ao criar chave.");
      return;
    }
    setRevealedSecret({ clientId: res.clientId, clientSecret: res.clientSecret });
    setKeys((prev) => [
      {
        id: res.id!,
        producer_id: "",
        label: label.trim() || "Chave de API",
        client_id: res.clientId!,
        client_secret_hash: "",
        revoked_at: null,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setLabel("");
  }

  async function handleRevoke(id: string) {
    const res = await revokeApiKey(id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)));
    toast.success("Chave revogada.");
  }

  async function handleSaveWebhook() {
    setSavingWebhook(true);
    const res = await saveDeveloperWebhook(webhookUrl, ["payment.completed"]);
    setSavingWebhook(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setRevealedWebhookSecret(res.secret ?? null);
    setHasWebhook(true);
    toast.success("Webhook configurado.");
  }

  async function handleDeleteWebhook() {
    const res = await deleteDeveloperWebhook();
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setHasWebhook(false);
    setWebhookUrl("");
    setRevealedWebhookSecret(null);
    toast.success("Webhook removido.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Chaves de API</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Use estas credenciais para autenticar chamadas à API pública da PagaJá (produtos, ofertas, pedidos e
            webhooks da sua conta).
          </p>

          {revealedSecret && (
            <div className="mt-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Guarde o client_secret agora — não será mostrado novamente.
              </p>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2 font-mono text-xs">
                <span className="truncate">client_id: {revealedSecret.clientId}</span>
                <button type="button" onClick={() => copy(revealedSecret.clientId)}>
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2 font-mono text-xs">
                <span className="truncate">client_secret: {revealedSecret.clientSecret}</span>
                <button type="button" onClick={() => copy(revealedSecret.clientSecret)}>
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Input placeholder="Nome da chave (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Button type="button" onClick={handleCreateKey} disabled={creating} className="shrink-0 gap-1.5">
              <Plus className="h-4 w-4" /> {creating ? "A criar…" : "Criar chave"}
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {keys.length === 0 && <p className="text-sm text-muted-foreground">Ainda não tem chaves de API.</p>}
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{k.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{k.client_id}</p>
                </div>
                {k.revoked_at ? (
                  <span className="text-xs text-muted-foreground">Revogada</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRevoke(k.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Webhook de vendas</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Receba um evento <code>payment.completed</code> assinado (HMAC-SHA256) sempre que uma venda sua for
            confirmada.
          </p>

          {revealedWebhookSecret && (
            <div className="mt-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Guarde o secret agora — não será mostrado novamente.
              </p>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2 font-mono text-xs">
                <span className="truncate">{revealedWebhookSecret}</span>
                <button type="button" onClick={() => copy(revealedWebhookSecret)}>
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="webhookUrl">URL do seu endpoint</Label>
              <Input
                id="webhookUrl"
                placeholder="https://seu-site.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleSaveWebhook} disabled={savingWebhook || !webhookUrl}>
                {savingWebhook ? "A guardar…" : hasWebhook ? "Atualizar webhook" : "Configurar webhook"}
              </Button>
              {hasWebhook && (
                <Button type="button" variant="outline" onClick={handleDeleteWebhook}>
                  Remover
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="font-semibold">Referência rápida</h2>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`# 1. Obter o token
curl -X POST ${baseUrl}/api/v1/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{ "client_id": "SEU_CLIENT_ID", "client_secret": "SEU_CLIENT_SECRET" }'

# 2. Usar o token
curl ${baseUrl}/api/v1/orders \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Endpoints disponíveis: <code>GET/POST /api/v1/products</code>, <code>GET /api/v1/offers</code>,{" "}
            <code>GET /api/v1/orders</code>, <code>GET/POST/DELETE /api/v1/webhooks</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
