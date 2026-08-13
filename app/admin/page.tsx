import Link from "next/link";
import { Users2, Package, TrendingUp, Wallet, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminOverview } from "@/lib/data/admin";
import { cn, formatCurrency } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const stats = await getAdminOverview();

  const tiles = [
    {
      label: "Utilizadores",
      value: stats.usersCount,
      icon: Users2,
      href: "/admin/users",
      style: "bg-primary/10 text-primary",
    },
    {
      label: "Produtos pendentes",
      value: stats.productsPendingCount,
      icon: Package,
      href: "/admin/products",
      style: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Saques pendentes",
      value: `${stats.withdrawalsPendingCount} (${formatCurrency(stats.withdrawalsPendingAmount, "MZN")})`,
      icon: Wallet,
      href: "/admin/withdrawals",
      style: "bg-emerald-500/10 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma PayNow.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Link
          href="/admin/revenue"
          className="group relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-lg transition-transform hover:-translate-y-0.5 lg:col-span-1"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Vendas totais</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="relative mt-3 text-3xl font-bold">{formatCurrency(stats.totalSales, "MZN")}</p>
          <p className="relative mt-1 flex items-center gap-1 text-xs text-white/70">
            Ver receita <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </p>
        </Link>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          {tiles.map((tile) => (
            <Link key={tile.label} href={tile.href}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tile.style)}>
                      <tile.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold">{tile.value}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
