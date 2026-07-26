import { redirect } from "next/navigation";
import { BarChart3, Bell, ScrollText, ShieldAlert, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/app/account/profile/profile-form";
import { SecurityCard } from "@/components/dashboard/security-card";
import { TrustScoreCard } from "@/components/dashboard/trust-score-card";
import { ToolCard } from "@/components/dashboard/tool-card";
import { ClearCacheButton } from "@/components/dashboard/clear-cache-button";
import { PushNotificationToggle } from "@/components/dashboard/push-notification-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getTrustScore } from "@/lib/data/trust-score";
import { hasPushSubscription } from "@/lib/actions/push";
import { signOut } from "@/lib/actions/auth";

export default async function DashboardSettingsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const [score, pushSubscribed] = await Promise.all([
    getTrustScore(user.id, profile.created_at),
    hasPushSubscription(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Definições</h1>
        <p className="text-sm text-muted-foreground">Gerencie o seu perfil, segurança e recursos avançados.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil do Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>

        <SecurityCard />
      </div>

      <TrustScoreCard score={score} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Ferramentas Avançadas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            icon={BarChart3}
            title="Relatórios Avançados"
            description="Acesse gráficos de vendas por período e o ranking dos seus produtos mais vendidos."
            cta="Acessar Relatórios"
            href="/dashboard"
          />
          <ToolCard icon={Bell} title="Notificações Push" description="Receba alertas de vendas em tempo real no seu navegador.">
            <PushNotificationToggle initiallySubscribed={pushSubscribed} />
          </ToolCard>
          <ToolCard
            icon={ScrollText}
            title="Manual de Taxas"
            description="Consulte as taxas de venda e de saque atualizadas."
            cta="Ler Manual"
            href="/taxas"
          />
          <ToolCard icon={ShieldAlert} title="Zona de Perigo" description="Limpar cache local ou resetar configurações da conta neste dispositivo.">
            <ClearCacheButton />
          </ToolCard>
          <ToolCard icon={LogOut} title="Sair da Conta" description="Encerrar sessão neste dispositivo de forma segura.">
            <form action={signOut}>
              <Button type="submit" size="sm" variant="outline" className="w-full">
                Sair Agora
              </Button>
            </form>
          </ToolCard>
        </div>
      </div>
    </div>
  );
}
