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
      <div>
        <h1 className="text-2xl font-bold">Programador</h1>
        <p className="text-sm text-muted-foreground">
          Integre a sua conta PagaJá com as suas próprias ferramentas via API.
        </p>
      </div>
      <DeveloperApiPanel
        apiKeys={apiKeys}
        webhook={webhook}
        baseUrl={baseUrl}
        productionUnlocked={unlockStatus.unlocked}
        pendingUnlockId={unlockStatus.pendingOrderId}
      />
    </div>
  );
}
