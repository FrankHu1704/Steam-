import { Wallet, TrendingUp, ShoppingCart, ArrowDownToLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPlatformRevenue } from "@/lib/data/admin";
import { cn, formatCurrency } from "@/lib/utils";

export default async function AdminRevenuePage() {
  const revenue = await getPlatformRevenue();

  const tiles = [
    {
      label: "Taxas de vendas (total)",
      value: revenue.salesFeesTotal,
      icon: ShoppingCart,
      style: "bg-primary/10 text-primary",
    },
    {
      label: "Taxas de vendas (mês)",
      value: revenue.salesFeesMonth,
      icon: ShoppingCart,
      style: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Taxas de saques (total)",
      value: revenue.withdrawalFeesTotal,
      icon: ArrowDownToLine,
      style: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Taxas de saques (mês)",
      value: revenue.withdrawalFeesMonth,
      icon: ArrowDownToLine,
      style: "bg-violet-500/10 text-violet-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Receita da Plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Soma das taxas cobradas (vendas + saques) — separado do saldo dos produtores.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Receita total</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="relative mt-3 text-3xl font-bold">{formatCurrency(revenue.totalRevenue, "MZN")}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Receita este mês</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="relative mt-3 text-3xl font-bold">{formatCurrency(revenue.monthRevenue, "MZN")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tile.style)}>
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
