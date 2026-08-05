import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsForm } from "@/components/admin/settings-form";
import { ToolCard } from "@/components/dashboard/tool-card";
import { PushNotificationToggle } from "@/components/dashboard/push-notification-toggle";
import { getAllSettings } from "@/lib/data/admin";
import { hasPushSubscription } from "@/lib/actions/push";

export default async function AdminSettingsPage() {
  const [settings, pushSubscribed] = await Promise.all([getAllSettings(), hasPushSubscription()]);
  const withdrawalFeePercent = Number(settings.find((s) => s.key === "withdrawal_fee_percent")?.value ?? 5);
  const platformFeePercent = Number(settings.find((s) => s.key === "platform_fee_percent")?.value ?? 10);
  const platformFixedFeeAmount = Number(settings.find((s) => s.key === "platform_fixed_fee_amount")?.value ?? 0);
  const withdrawalMinimumAmount = Number(settings.find((s) => s.key === "withdrawal_minimum_amount")?.value ?? 150);
  const paymentProvider =
    (settings.find((s) => s.key === "payment_provider")?.value as
      | "debito_pay"
      | "zumbopay"
      | "netshop"
      | undefined) ?? "debito_pay";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Definições</h1>
        <p className="text-sm text-muted-foreground">Configurações globais da plataforma.</p>
      </div>

      <Card className="max-w-lg">
        <CardContent className="p-6">
          <SettingsForm
            withdrawalFeePercent={withdrawalFeePercent}
            platformFeePercent={platformFeePercent}
            platformFixedFeeAmount={platformFixedFeeAmount}
            withdrawalMinimumAmount={withdrawalMinimumAmount}
            paymentProvider={paymentProvider}
          />
        </CardContent>
      </Card>

      <div className="max-w-lg">
        <ToolCard
          icon={Bell}
          title="Notificações Push"
          description="Receba um alerta em tempo real no navegador a cada nova venda na plataforma, incluindo vendas via API."
        >
          <PushNotificationToggle initiallySubscribed={pushSubscribed} />
        </ToolCard>
      </div>
    </div>
  );
}
