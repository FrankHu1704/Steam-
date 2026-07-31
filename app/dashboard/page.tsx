import Link from "next/link";
import { Wallet, TrendingUp, CalendarDays, Users2, ArrowUpRight, ArrowDownRight, PhoneCall, Trophy, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { cn, formatCurrency } from "@/lib/utils";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getDashboardStats, DASHBOARD_PERIODS, type DashboardPeriod } from "@/lib/data/dashboard";
import { getProducerAchievements } from "@/lib/data/achievements";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const { days: daysParam } = await searchParams;
  const requestedDays = Number(daysParam);
  const days = (DASHBOARD_PERIODS.includes(requestedDays as DashboardPeriod) ? requestedDays : 14) as DashboardPeriod;

  const [stats, achievements] = await Promise.all([
    getDashboardStats(user.id, days),
    getProducerAchievements(user.id),
  ]);
  const currency = profile.currency as "MZN" | "ZAR";

  const tiles = [
    {
      label: "Vendas hoje",
      value: formatCurrency(stats.salesToday, currency),
      icon: CalendarDays,
      style: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Vendas do mês",
      value: formatCurrency(stats.salesMonth, currency),
      icon: TrendingUp,
      style: "bg-primary/10 text-primary",
      change: stats.salesMonthChangePercent,
    },
    {
      label: "Lucro do mês",
      value: formatCurrency(stats.profitMonth, currency),
      icon: ArrowUpRight,
      style: "bg-emerald-500/10 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Visão Geral</h1>
            <Link
              href="/dashboard/achievements"
              title={`Nível ${achievements.currentTier.label}`}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm"
            >
              {achievements.currentTier.icon}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">Olá, {profile.name}. Aqui está o seu resumo financeiro.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">Criar produto</Link>
        </Button>
      </div>

      {!profile.phone && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-center gap-3">
            <PhoneCall className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-amber-900 dark:text-amber-200">
              Adicione o seu número de telemóvel para receber notificações de vendas.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/settings">Atualizar Perfil</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Link
          href="/dashboard/withdrawals"
          className="group relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-lg transition-transform hover:-translate-y-0.5 lg:col-span-1"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Saldos disponíveis</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="relative mt-3 flex items-end justify-between gap-3 border-b border-white/15 pb-3">
            <p className="text-xs text-white/70">Produtor</p>
            <p className="text-2xl font-bold">{formatCurrency(profile.balance_available, currency)}</p>
          </div>
          <div className="relative mt-3 flex items-end justify-between gap-3">
            <p className="text-xs text-white/70">Programador (API)</p>
            <p className="text-2xl font-bold">{formatCurrency(profile.balance_available_dev, currency)}</p>
          </div>
          <p className="relative mt-3 flex items-center gap-1 text-xs text-white/70">
            Sacar agora <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </p>
        </Link>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          {tiles.map((tile) => (
            <Card key={tile.label} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tile.style)}>
                    <tile.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold">{tile.value}</p>
                {"change" in tile && tile.change != null && (
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1 text-xs font-medium",
                      tile.change >= 0 ? "text-emerald-600" : "text-destructive"
                    )}
                  >
                    {tile.change >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(tile.change)}% vs. mês passado
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>Vendas (últimos {days} dias)</CardTitle>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {DASHBOARD_PERIODS.map((p) => (
                <Link
                  key={p}
                  href={`/dashboard?days=${p}`}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    p === days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}d
                </Link>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <SalesChart data={stats.chart} currency={profile.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-4 w-4" /> Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.customersCount}</p>
            <p className="text-sm text-muted-foreground">clientes únicos até hoje</p>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-3xl font-bold">{stats.ordersCount}</p>
              <p className="text-sm text-muted-foreground">vendas nos últimos {days} dias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Produtos mais vendidos (últimos {days} dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Ainda não tem vendas neste período.</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => {
                const maxRevenue = stats.topProducts[0].revenue || 1;
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground">{i + 1}º</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{p.title}</p>
                        <p className="shrink-0 text-sm font-semibold">
                          {formatCurrency(p.revenue, currency)}
                        </p>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand-gradient"
                          style={{ width: `${Math.max(4, (p.revenue / maxRevenue) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{p.salesCount} vendas</span>
                        {p.conversionPercent != null && (
                          <span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
                            <Target className="h-3 w-3" /> {p.conversionPercent}% conversão
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendas recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentSales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Ainda não tem vendas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Produto</th>
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium">Valor</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 font-medium">{sale.product_title}</td>
                      <td className="py-2.5 text-muted-foreground">{sale.buyer_name}</td>
                      <td className="py-2.5">{formatCurrency(sale.total_amount, sale.currency as "MZN" | "ZAR")}</td>
                      <td className="py-2.5">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {sale.paid_at ? new Date(sale.paid_at).toLocaleDateString("pt-MZ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
