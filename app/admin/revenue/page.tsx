import { Wallet, TrendingUp, ShoppingCart, ArrowDownToLine, Users, BadgeMinus, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPlatformRevenue, type RevenuePeriod } from "@/lib/data/admin";
import { cn, formatCurrency } from "@/lib/utils";

export default async function AdminRevenuePage() {
  const revenue = await getPlatformRevenue();

  const profitTiles: { label: string; period: RevenuePeriod }[] = [
    { label: "Hoje", period: revenue.today },
    { label: "Ontem", period: revenue.yesterday },
    { label: "Últimos 7 dias", period: revenue.last7Days },
    { label: "Este mês", period: revenue.thisMonth },
    { label: "Total", period: revenue.allTime },
  ];

  const grossTiles = [
    {
      label: "Taxas de vendas (total)",
      value: revenue.allTime.salesFees,
      icon: ShoppingCart,
      style: "bg-primary/10 text-primary",
    },
    {
      label: "Taxas de vendas (mês)",
      value: revenue.thisMonth.salesFees,
      icon: ShoppingCart,
      style: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Taxas de saques (total)",
      value: revenue.allTime.withdrawalFees,
      icon: ArrowDownToLine,
      style: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Taxas de saques (mês)",
      value: revenue.thisMonth.withdrawalFees,
      icon: ArrowDownToLine,
      style: "bg-violet-500/10 text-violet-600",
    },
  ];

  const costTiles = [
    {
      label: "Comissões de colaboradores (total)",
      value: revenue.allTime.employeeCommissions,
      icon: Users,
      style: "bg-rose-500/10 text-rose-600",
    },
    {
      label: "Comissões de colaboradores (mês)",
      value: revenue.thisMonth.employeeCommissions,
      icon: Users,
      style: "bg-rose-500/10 text-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Receita da Plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Faturamento total, lucro líquido por período, receita bruta e custos com colaboradores — separado do
          saldo dos produtores.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <p className="text-sm font-medium text-white/80">Faturamento total (todas as vendas pagas)</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Receipt className="h-4 w-4" />
          </div>
        </div>
        <p className="relative mt-3 text-3xl font-bold">{formatCurrency(revenue.allTime.grossVolume, "MZN")}</p>
        <p className="relative mt-1 text-xs text-white/70">
          Volume total processado, incluindo o que fica com os produtores — não é lucro da PagaJá.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Lucro líquido por período</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {profitTiles.map((tile) => (
            <Card key={tile.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {tile.label === "Total" ? <Wallet className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  </div>
                </div>
                <p className="mt-3 text-xl font-bold">{formatCurrency(tile.period.netProfit, "MZN")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Receita bruta (antes de custos)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {grossTiles.map((tile) => (
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
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Custos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {costTiles.map((tile) => (
            <Card key={tile.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tile.style)}>
                    <tile.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-rose-600 dark:text-rose-400">
                  −{formatCurrency(tile.value, "MZN")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
          <BadgeMinus className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            "Faturamento total" soma o <code>total_amount</code> de toda venda paga desde sempre — é o volume bruto
            processado pela plataforma, não o lucro da PagaJá. "Taxas de vendas" soma o{" "}
            <code>platform_fee_amount</code> guardado em cada encomenda paga (calculado a partir de{" "}
            <code>settings.platform_fee_percent</code> no momento em que foi creditada). "Taxas de saques" soma o{" "}
            <code>fee_amount</code> de cada levantamento já pago ou confirmado. "Comissões de colaboradores" soma o
            que cada colaborador acumulou por ter recrutado o produtor (nos primeiros 3 meses da conta), e é sempre
            um custo dentro da própria taxa de venda — nunca faz o lucro líquido ficar negativo por si só. O "Lucro
            líquido" de cada período é a receita bruta desse período menos essas comissões. "Hoje"/"Ontem" usam o
            dia em hora de Maputo (UTC+2); "Últimos 7 dias" é uma janela móvel, não a semana de calendário.{" "}
            <strong>Não inclui taxas cobradas pelo processador de pagamento</strong> (ZumboPay/NetShop/Debito Pay),
            porque esses valores não são devolvidos pela API deles — se o seu processador cobrar uma taxa por
            transação, subtraia-a manualmente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
