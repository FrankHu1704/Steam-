import { Wallet, TrendingUp, ShoppingCart, ArrowDownToLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPlatformRevenue } from "@/lib/data/admin";
import { formatCurrency } from "@/lib/utils";

export default async function AdminRevenuePage() {
  const revenue = await getPlatformRevenue();

  const tiles = [
    { label: "Receita total", value: revenue.totalRevenue, icon: Wallet, highlight: true },
    { label: "Receita este mês", value: revenue.monthRevenue, icon: TrendingUp, highlight: true },
    { label: "Taxas de vendas (total)", value: revenue.salesFeesTotal, icon: ShoppingCart },
    { label: "Taxas de vendas (mês)", value: revenue.salesFeesMonth, icon: ShoppingCart },
    { label: "Taxas de saques (total)", value: revenue.withdrawalFeesTotal, icon: ArrowDownToLine },
    { label: "Taxas de saques (mês)", value: revenue.withdrawalFeesMonth, icon: ArrowDownToLine },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Receita da Plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Soma das taxas cobradas (vendas + saques) — separado do saldo dos produtores.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className={tile.highlight ? "border-primary/40" : undefined}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-white">
                  <tile.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold">{formatCurrency(tile.value, "MZN")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          <p>
            "Taxas de vendas" soma o <code>platform_fee_amount</code> guardado em cada encomenda paga (calculado a
            partir de <code>settings.platform_fee_percent</code> no momento em que foi creditada). "Taxas de saques"
            soma o <code>fee_amount</code> de cada levantamento já pago ou confirmado. Este valor é receita da
            PagaJá — não faz parte do saldo disponível dos produtores.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
