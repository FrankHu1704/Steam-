import { Trophy, CheckCircle2, Lock, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getProducerAchievements, ACHIEVEMENT_TIERS } from "@/lib/data/achievements";
import { getProducerPrizeProgress, PRIZE_TIERS } from "@/lib/data/prizes";
import { cn, formatCurrency } from "@/lib/utils";

export default async function AchievementsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const [progress, prizeProgress] = await Promise.all([
    getProducerAchievements(user.id),
    getProducerPrizeProgress(user.id),
  ]);
  const currency = profile.currency as "MZN" | "ZAR";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Premiações</h1>
        <p className="text-sm text-muted-foreground">
          O seu nível sobe automaticamente com cada venda confirmada, e o seu faturamento acumulado desbloqueia
          prémios físicos.
        </p>
      </div>

      <h2 className="-mb-2 text-sm font-semibold text-muted-foreground">Nível</h2>

      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-4xl">
            {progress.currentTier.icon}
          </span>
          <div>
            <p className="text-sm font-medium text-white/80">O seu nível actual</p>
            <p className="text-2xl font-bold">{progress.currentTier.label}</p>
            <p className="text-sm text-white/70">{progress.totalSales} venda{progress.totalSales === 1 ? "" : "s"} confirmada{progress.totalSales === 1 ? "" : "s"}</p>
          </div>
        </div>

        {progress.nextTier ? (
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>Próximo nível: {progress.nextTier.label} {progress.nextTier.icon}</span>
              <span>{progress.progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress.progressPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-white/70">
              Faltam {Math.max(0, progress.nextTier.threshold - progress.totalSales)} venda
              {progress.nextTier.threshold - progress.totalSales === 1 ? "" : "s"} para o próximo nível.
            </p>
          </div>
        ) : (
          <p className="relative mt-6 text-sm text-white/80">Atingiu o nível máximo — parabéns! 🎉</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENT_TIERS.map((tier) => {
          const achieved = progress.totalSales >= tier.threshold;
          return (
            <Card key={tier.key} className={cn(!achieved && "opacity-60")}>
              <CardContent className="flex items-start gap-3 p-5">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
                    achieved ? "bg-brand-gradient" : "bg-muted grayscale"
                  )}
                >
                  {tier.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold">{tier.label}</p>
                    {achieved ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tier.threshold === 0 ? "Desde o início" : `A partir de ${tier.threshold} vendas`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{tier.perk}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Trophy className="h-4 w-4 shrink-0 text-primary" />
        <p>O nível é calculado a partir do total de vendas confirmadas (pagas) em todos os seus produtos, desde sempre.</p>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">Prémios físicos</h2>

      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-4xl">
            🎁
          </span>
          <div>
            <p className="text-sm font-medium text-white/80">Faturamento acumulado</p>
            <p className="text-2xl font-bold">{formatCurrency(prizeProgress.lifetimeRevenue, currency)}</p>
            <p className="text-sm text-white/70">
              {prizeProgress.earnedTiers.length} prémio{prizeProgress.earnedTiers.length === 1 ? "" : "s"} ganho
              {prizeProgress.earnedTiers.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {prizeProgress.nextTier ? (
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>
                Próximo prémio: {prizeProgress.nextTier.prize} ({prizeProgress.nextTier.label}){" "}
                {prizeProgress.nextTier.icon}
              </span>
              <span>{prizeProgress.progressToNextPercent}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${prizeProgress.progressToNextPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/70">
              Faltam {formatCurrency(Math.max(0, prizeProgress.nextTier.threshold - prizeProgress.lifetimeRevenue), currency)}{" "}
              para o próximo prémio.
            </p>
          </div>
        ) : (
          <p className="relative mt-6 text-sm text-white/80">Já ganhou todos os prémios disponíveis — parabéns! 🎉</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRIZE_TIERS.map((tier) => {
          const achieved = prizeProgress.lifetimeRevenue >= tier.threshold;
          return (
            <Card key={tier.key} className={cn(!achieved && "opacity-60")}>
              <CardContent className="flex items-start gap-3 p-5">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
                    achieved ? "bg-brand-gradient" : "bg-muted grayscale"
                  )}
                >
                  {tier.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold">{tier.prize}</p>
                    {achieved ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">A partir de {tier.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Gift className="h-4 w-4 shrink-0 text-primary" />
        <p>
          Os prémios físicos são enviados manualmente pela equipa PagaJá depois de atingir cada valor de
          faturamento — entraremos em contacto para combinar a entrega.
        </p>
      </div>
    </div>
  );
}
