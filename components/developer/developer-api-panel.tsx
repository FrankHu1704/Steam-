"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { CheckCircle2, Copy, KeyRound, Lock, Plus, ReceiptText, ShieldCheck, Trash2, Unlock, Webhook } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TokenTester } from "@/components/developer/token-tester";
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

type UnlockMethod = "mpesa" | "emola";

const UNLOCK_METHODS: { value: UnlockMethod; label: string; logo: string }[] = [
  { value: "mpesa", label: "M-Pesa", logo: "/payment-logos/mpesa.png" },
  { value: "emola", label: "e-Mola", logo: "/payment-logos/emola.png" },
];

function RevealedSecret({ clientId, clientSecret }: { clientId: string; clientSecret: string }) {
  return (
    <div className="mt-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
      <p className="font-semibold text-amber-800 dark:text-amber-200">
        Guarde o client_secret agora — não será mostrado novamente.
      </p>
      <div className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2 font-mono text-xs">
        <span className="truncate">client_id: {clientId}</span>
        <button type="button" onClick={() => copy(clientId)}>
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2 font-mono text-xs">
        <span className="truncate">client_secret: {clientSecret}</span>
        <button type="button" onClick={() => copy(clientSecret)}>
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
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

  const [testLabel, setTestLabel] = useState("");
  const [creatingTest, setCreatingTest] = useState(false);
  const [revealedTestSecret, setRevealedTestSecret] = useState<{ clientId: string; clientSecret: string } | null>(
    null
  );

  const [liveLabel, setLiveLabel] = useState("");
  const [creatingLive, setCreatingLive] = useState(false);
  const [revealedLiveSecret, setRevealedLiveSecret] = useState<{ clientId: string; clientSecret: string } | null>(
    null
  );

  const [webhookUrl, setWebhookUrl] = useState(webhook?.url ?? "");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<string | null>(null);
  const [hasWebhook, setHasWebhook] = useState(!!webhook);

  const [unlocked, setUnlocked] = useState(productionUnlocked);
  const [unlockMethod, setUnlockMethod] = useState<UnlockMethod>("mpesa");
  const [unlockPhone, setUnlockPhone] = useState("");
  const [unlocking, setUnlocking] = useState(!!pendingUnlockId);

  const hasTestKey = keys.some((k) => k.mode === "test" && !k.revoked_at);
  const step2Unlocked = hasTestKey || unlocked;

  async function createKey(
    mode: ApiKeyMode,
    label: string,
    setCreating: (v: boolean) => void,
    setRevealed: (v: { clientId: string; clientSecret: string }) => void,
    clearLabel: () => void
  ) {
    setCreating(true);
    const res = await createApiKey(label, mode);
    setCreating(false);
    if (res.error || !res.id || !res.clientId || !res.clientSecret) {
      toast.error(res.error ?? "Falha ao criar chave.");
      return;
    }
    setRevealed({ clientId: res.clientId, clientSecret: res.clientSecret });
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
    clearLabel();
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
    const res = await requestProductionUnlock(unlockPhone.trim(), unlockMethod);
    if (res.error || !res.unlockId) {
      setUnlocking(false);
      toast.error(res.error ?? "Falha ao iniciar o pagamento.");
      return;
    }
    toast.info(
      `Confirme o pagamento de 300 MT no seu telemóvel (${UNLOCK_METHODS.find((m) => m.value === unlockMethod)?.label}).`
    );
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
      {/* Step 1 — test */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              1
            </span>
            <h2 className="font-semibold">Teste a sua integração</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma chave de <strong>teste</strong> (grátis, cobranças simuladas, sem dinheiro real) e confirme que
            o seu checkout personalizado funciona chamando <code>POST /api/v1/charges</code>. Só depois disso avance
            para o modo produção.
          </p>

          {revealedTestSecret && <RevealedSecret {...revealedTestSecret} />}

          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Nome da chave de teste (opcional)"
              value={testLabel}
              onChange={(e) => setTestLabel(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => void createKey("test", testLabel, setCreatingTest, setRevealedTestSecret, () => setTestLabel(""))}
              disabled={creatingTest}
              className="shrink-0 gap-1.5"
            >
              <Plus className="h-4 w-4" /> {creatingTest ? "A criar…" : "Criar chave de teste"}
            </Button>
          </div>

          {hasTestKey && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Chave de teste criada — já pode avançar para o passo 2.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — production */}
      <Card className={cn(!step2Unlocked && "opacity-60")}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white",
                step2Unlocked ? "bg-primary" : "bg-muted-foreground"
              )}
            >
              2
            </span>
            <h2 className="font-semibold">Ativar modo produção</h2>
            {unlocked ? (
              <Unlock className="h-4 w-4 text-emerald-600" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {!step2Unlocked ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Crie e confirme uma chave de teste no passo 1 primeiro. Depois disso pode desbloquear cobranças reais
              com um pagamento único de 300 MT.
            </p>
          ) : unlocked ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Crie uma chave live para cobrar de verdade.</p>

              {revealedLiveSecret && <RevealedSecret {...revealedLiveSecret} />}

              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Nome da chave live (opcional)"
                  value={liveLabel}
                  onChange={(e) => setLiveLabel(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={() =>
                    void createKey("live", liveLabel, setCreatingLive, setRevealedLiveSecret, () => setLiveLabel(""))
                  }
                  disabled={creatingLive}
                  className="shrink-0 gap-1.5"
                >
                  <Plus className="h-4 w-4" /> {creatingLive ? "A criar…" : "Criar chave live"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Tudo a funcionar no teste? Desbloqueie cobranças reais com um pagamento único.
              </p>
              <div className="mt-4 max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-md">
                <div className="bg-brand-gradient px-5 py-4 text-white">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-white/80">
                    <ReceiptText className="h-3.5 w-3.5" /> Desbloquear modo produção
                  </p>
                  <p className="mt-1 text-3xl font-bold">300,00 MT</p>
                  <p className="text-xs text-white/80">Pagamento único — acesso vitalício a chaves live</p>
                </div>
                <div className="space-y-4 p-5">
                  <div className="space-y-1.5">
                    <Label>Método de pagamento</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {UNLOCK_METHODS.map((m) => {
                        const selected = unlockMethod === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setUnlockMethod(m.value)}
                            className={cn(
                              "relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 bg-white p-3 transition-all",
                              selected
                                ? "border-primary shadow-md shadow-primary/10"
                                : "border-border hover:border-primary/40 hover:shadow-sm"
                            )}
                          >
                            {selected && (
                              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                                <CheckCircle2 className="h-3 w-3" />
                              </span>
                            )}
                            <span className="flex h-9 w-full items-center justify-center">
                              <Image src={m.logo} alt={m.label} width={72} height={36} className="h-8 w-auto object-contain" />
                            </span>
                            <span className="text-xs font-medium text-slate-700">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="unlockPhone">
                      Número {UNLOCK_METHODS.find((m) => m.value === unlockMethod)?.label}
                    </Label>
                    <div className="flex overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                      <span className="flex items-center bg-muted px-3 text-sm font-medium text-muted-foreground">
                        +258
                      </span>
                      <Input
                        id="unlockPhone"
                        placeholder="84xxxxxxx"
                        value={unlockPhone}
                        onChange={(e) => setUnlockPhone(e.target.value)}
                        className="rounded-none border-0 focus:ring-0"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleUnlock}
                    disabled={unlocking}
                    className="w-full gap-2 shadow-lg shadow-primary/20"
                  >
                    {unlocking ? "A confirmar…" : <Lock className="h-4 w-4" />}
                    {unlocking ? "" : "Pagar 300,00 MT"}
                  </Button>

                  <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Pagamento 100% seguro
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Key list */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Chaves de API</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Todas as suas chaves de teste e produção, num só lugar.</p>

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
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Obter token de acesso</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cole o <code>client_id</code> e <code>client_secret</code> de uma das suas chaves (guardados quando a
            criou) para obter um <code>access_token</code> diretamente aqui — sem precisar de correr um comando.
          </p>
          <div className="mt-4">
            <TokenTester />
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Referência rápida</h2>
            <Link href="/dashboard/developer/docs" className="text-xs font-medium text-primary hover:underline">
              Ver documentação completa →
            </Link>
          </div>
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
