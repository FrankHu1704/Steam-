import Link from "next/link";
import { Wallet, TrendingUp, CalendarDays, Users2, ArrowUpRight, PhoneCall } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getDashboardStats } from "@/lib/data/dashboard";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardOverviewPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const stats = await getDashboardStats(user.id);
  const currency = profile.currency as "MZN" | "ZAR";

  const tiles = [
    {
      label: "Saldo disponível",
      value: formatCurrency(profile.balance_available, currency),
      icon: Wallet,
    },
    {
      label: "Vendas hoje",
      value: formatCurrency(stats.salesToday, currency),
      icon: CalendarDays,
    },
    {
      label: "Vendas do mês",
      value: formatCurrency(stats.salesMonth, currency),
      icon: TrendingUp,
    },
    {
      label: "Lucro do mês",
      value: formatCurrency(stats.profitMonth, currency),
      icon: ArrowUpRight,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visão Geral</h1>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-white">
                  <tile.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vendas (últimos 14 dias)</CardTitle>
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
              <p className="text-sm text-muted-foreground">vendas nos últimos 14 dias</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
