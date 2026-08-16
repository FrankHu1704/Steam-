"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveSubscription, removeSubscription, logPushClientError } from "@/lib/actions/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// A valid VAPID public key decodes to an uncompressed P-256 EC point: 65
// bytes starting with 0x04. Catching a malformed key here (stray
// whitespace/newline pasted into the Vercel env var, mismatched pair, wrong
// value entirely) gives a specific, actionable message instead of letting it
// reach pushManager.subscribe(), where WebKit just reports the opaque
// "Failed due to internal service error" no matter what's actually wrong.
function isValidVapidKey(key: Uint8Array): boolean {
  return key.length === 65 && key[0] === 0x04;
}

// iOS only allows Web Push for a PWA installed via "Adicionar ao Ecrã
// Inicial" (Safari's own tab is never enough, even on iOS 16.4+) —
// pushManager.subscribe() just rejects there, which used to surface as
// the same generic "Falha ao ativar notificações." as any other error.
function isIosNotInstalled(): boolean {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !isStandalone;
}

export function PushNotificationToggle({ initiallySubscribed }: { initiallySubscribed: boolean }) {
  const [subscribed, setSubscribed] = useState(initiallySubscribed);
  const [pending, setPending] = useState(false);
  const [supported, setSupported] = useState(true);
  const [needsIosInstall, setNeedsIosInstall] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) setSupported(false);
    setNeedsIosInstall(isIosNotInstalled());
  }, []);

  async function handleEnable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("Notificações push não estão configuradas.");
      return;
    }
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permissão de notificações negada.");
        return;
      }
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      if (!isValidVapidKey(applicationServerKey)) {
        toast.error("Chave de notificações mal configurada (contacte o suporte).");
        await logPushClientError({
          message: `invalid VAPID key shape: length=${applicationServerKey.length}`,
          userAgent: navigator.userAgent,
        });
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      const json = subscription.toJSON();
      const res = await saveSubscription({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        setSubscribed(true);
        toast.success("Notificações push ativadas!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        isIosNotInstalled()
          ? "No iPhone, adicione a PayNow ao ecrã inicial primeiro (veja as instruções abaixo)."
          : `Falha ao ativar notificações${message ? `: ${message}` : "."}`
      );
      await logPushClientError({ message, userAgent: navigator.userAgent });
    } finally {
      setPending(false);
    }
  }

  async function handleDisable() {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removeSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notificações push desativadas.");
    } finally {
      setPending(false);
    }
  }

  if (!supported) {
    return (
      <Button size="sm" variant="outline" disabled className="w-full">
        Não suportado neste navegador
      </Button>
    );
  }

  if (needsIosInstall && !subscribed) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <Share className="h-3.5 w-3.5" /> Adicione ao ecrã inicial primeiro
        </p>
        <p>
          No iPhone, as notificações só funcionam depois de instalar a PayNow: toque em{" "}
          <strong>Partilhar</strong> → <strong>Adicionar ao Ecrã Inicial</strong>, depois abra a PayNow a partir
          desse ícone (não do Safari) e volte aqui para ativar.
        </p>
      </div>
    );
  }

  return subscribed ? (
    <Button size="sm" variant="outline" onClick={handleDisable} disabled={pending} className="w-full gap-1.5">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
      Desativar notificações
    </Button>
  ) : (
    <Button size="sm" onClick={handleEnable} disabled={pending} className="w-full gap-1.5">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
      Ativar notificações
    </Button>
  );
}
