import { Users2, Package, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminOverview } from "@/lib/data/admin";
import { formatCurrency } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const stats = await getAdminOverview();

  const tiles = [
    { label: "Utilizadores", value: stats.usersCount, icon: Users2 },
    { label: "Produtos pendentes", value: stats.productsPendingCount, icon: Package },
    { label: "Vendas totais", value: formatCurrency(stats.totalSales, "MZN"), icon: TrendingUp },
    {
      label: "Saques pendentes",
      value: `${stats.withdrawalsPendingCount} (${formatCurrency(stats.withdrawalsPendingAmount, "MZN")})`,
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma PagaJá.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
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
    </div>
  );
}
