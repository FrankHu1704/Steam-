import Link from "next/link";
import { BookOpen } from "lucide-react";
import { DeveloperApiPanel } from "@/components/developer/developer-api-panel";
import { getApiKeys, getDeveloperWebhook, getProductionUnlockStatus } from "@/lib/actions/developer";

export default async function DeveloperPage() {
  const [apiKeys, webhook, unlockStatus] = await Promise.all([
    getApiKeys(),
    getDeveloperWebhook(),
    getProductionUnlockStatus(),
  ]);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pagaja.vercel.app";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Programador</h1>
          <p className="text-sm text-muted-foreground">
            Integre a sua conta PagaJá com as suas próprias ferramentas via API.
          </p>
        </div>
        <Link
          href="/dashboard/developer/docs"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <BookOpen className="h-4 w-4" /> Documentação completa
        </Link>
      </div>
      <DeveloperApiPanel
        apiKeys={apiKeys}
        webhook={webhook}
        baseUrl={baseUrl}
        productionUnlocked={unlockStatus.unlocked}
        pendingUnlockId={unlockStatus.pendingOrderId}
        trialActive={unlockStatus.trialActive}
        trialExpiresAt={unlockStatus.trialExpiresAt}
        trialExpired={unlockStatus.trialExpired}
        canStartTrial={unlockStatus.canStartTrial}
      />
    </div>
  );
}
