"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Lock, Plus, Trash2, Unlock, Webhook } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createApiKey,
  revokeApiKey,
  saveDeveloperWebhook,
  deleteDeveloperWebhook,
  requestProductionUnlock,
  checkProductionUnlockStatus,
} from "@/lib/actions/developer";
import type { ApiKey, ApiKeyMode, DeveloperWebhook } from "@/types/database";

function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado.");
}

export function DeveloperApiPanel({
  apiKeys,
  webhook,
  baseUrl,
  productionUnlocked,
  pendingUnlockId,
}: {
  apiKeys: ApiKey[];
  webhook: DeveloperWebhook | null;
  baseUrl: string;
  productionUnlocked: boolean;
  pendingUnlockId?: string;
}) {
  const [keys, setKeys] = useState(apiKeys);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<ApiKeyMode>("test");
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<{ clientId: string; clientSecret: string } | null>(null);

  const [webhookUrl, setWebhookUrl] = useState(webhook?.url ?? "");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<string | null>(null);
  const [hasWebhook, setHasWebhook] = useState(!!webhook);

  const [unlocked, setUnlocked] = useState(productionUnlocked);
  const [unlockPhone, setUnlockPhone] = useState("");
  const [unlocking, setUnlocking] = useState(!!pendingUnlockId);

  async function handleCreateKey() {
    setCreating(true);
    const res = await createApiKey(label, mode);
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
        mode,
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

  async function pollUnlock(unlockId: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const res = await checkProductionUnlockStatus(unlockId);
      if (res.status === "paid") {
        setUnlocked(true);
        setUnlocking(false);
        toast.success("Modo produção desbloqueado!");
        return;
      }
      if (res.status === "failed") {
        setUnlocking(false);
        toast.error("Pagamento não confirmado. Tente novamente.");
        return;
      }
    }
    setUnlocking(false);
  }

  async function handleUnlock() {
    if (!unlockPhone.trim()) {
      toast.error("Indique o número de telemóvel.");
      return;
    }
    setUnlocking(true);
    const res = await requestProductionUnlock(unlockPhone.trim());
    if (res.error || !res.unlockId) {
      setUnlocking(false);
      toast.error(res.error ?? "Falha ao iniciar o pagamento.");
      return;
    }
    toast.info("Confirme o pagamento de 300 MT no seu telemóvel.");
    void pollUnlock(res.unlockId);
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
            {unlocked ? <Unlock className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-primary" />}
            <h2 className="font-semibold">Checkout personalizado</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Use uma chave de <strong>teste</strong> (grátis, cobranças simuladas) para construir o seu próprio
            checkout via <code>POST /api/v1/charges</code>. Para cobranças reais, desbloqueie o{" "}
            <strong>modo produção</strong> com um pagamento único de 300 MT.
          </p>

          {unlocked ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              Modo produção desbloqueado — já pode criar chaves live.
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Número de telemóvel (M-Pesa/e-Mola)"
                value={unlockPhone}
                onChange={(e) => setUnlockPhone(e.target.value)}
              />
              <Button type="button" onClick={handleUnlock} disabled={unlocking} className="shrink-0">
                {unlocking ? "A confirmar…" : "Desbloquear — 300 MT"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Chaves de API</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Use estas credenciais para autenticar chamadas à API pública da PagaJá (produtos, ofertas, pedidos,
            cobranças e webhooks da sua conta).
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

          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("test")}
                className={cn(
                  "rounded-lg border-2 px-3 py-1.5 text-sm font-medium",
                  mode === "test" ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                Teste
              </button>
              <button
                type="button"
                onClick={() => unlocked && setMode("live")}
                disabled={!unlocked}
                className={cn(
                  "rounded-lg border-2 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
                  mode === "live" ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                Produção {!unlocked && "🔒"}
              </button>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Nome da chave (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} />
              <Button type="button" onClick={handleCreateKey} disabled={creating} className="shrink-0 gap-1.5">
                <Plus className="h-4 w-4" /> {creating ? "A criar…" : "Criar chave"}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {keys.length === 0 && <p className="text-sm text-muted-foreground">Ainda não tem chaves de API.</p>}
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {k.label}{" "}
                    <span
                      className={cn(
                        "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                        k.mode === "live" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {k.mode}
                    </span>
                  </p>
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

# 2. Criar uma cobrança (checkout personalizado)
curl -X POST ${baseUrl}/api/v1/charges \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "product_id": "...", "customer_name": "...", "customer_email": "...", "customer_phone": "84...", "payment_method": "mpesa" }'`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Outros endpoints: <code>GET/POST /api/v1/products</code>, <code>GET /api/v1/offers</code>,{" "}
            <code>GET /api/v1/orders</code>, <code>GET/POST/DELETE /api/v1/webhooks</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
