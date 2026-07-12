import { Card, CardContent } from "@/components/ui/card";
import { SettingsForm } from "@/components/admin/settings-form";
import { getAllSettings } from "@/lib/data/admin";

export default async function AdminSettingsPage() {
  const settings = await getAllSettings();
  const withdrawalFeePercent = Number(settings.find((s) => s.key === "withdrawal_fee_percent")?.value ?? 5);
  const platformFeePercent = Number(settings.find((s) => s.key === "platform_fee_percent")?.value ?? 0);
  const withdrawalMinimumAmount = Number(settings.find((s) => s.key === "withdrawal_minimum_amount")?.value ?? 150);

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
            withdrawalMinimumAmount={withdrawalMinimumAmount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
