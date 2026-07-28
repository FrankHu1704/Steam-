import { Users2, MousePointerClick, TrendingUp, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getProducerAffiliates } from "@/lib/data/affiliates";
import { cn, formatCurrency } from "@/lib/utils";

export default async function DashboardAffiliatesPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const affiliates = await getProducerAffiliates(user.id);
  const currency = profile.currency as "MZN" | "ZAR";

  const totalClicks = affiliates.reduce((sum, a) => sum + a.clicks, 0);
  const totalSales = affiliates.reduce((sum, a) => sum + a.sales, 0);
  const totalEarned = affiliates.reduce((sum, a) => sum + a.commission_earned, 0);

  const tiles = [
    { label: "Afiliados", value: affiliates.length, icon: Users2, style: "bg-primary/10 text-primary" },
    { label: "Cliques", value: totalClicks, icon: MousePointerClick, style: "bg-amber-500/10 text-amber-600" },
    { label: "Vendas", value: totalSales, icon: TrendingUp, style: "bg-emerald-500/10 text-emerald-600" },
    { label: "Ganhos gerados", value: formatCurrency(totalEarned, currency), icon: Coins, style: "bg-violet-500/10 text-violet-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Afiliados</h1>
        <p className="text-sm text-muted-foreground">Pessoas a promover os seus produtos, ordenadas por comissão gerada.</p>
      </div>

      {affiliates.length > 0 && (
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
                <p className="mt-3 text-2xl font-bold">{tile.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {affiliates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Users2 className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Ainda não tem afiliados. Ative a afiliação nas definições de um produto para começar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">#</th>
                    <th className="p-4 font-medium">Afiliado</th>
                    <th className="p-4 font-medium">Produto</th>
                    <th className="p-4 font-medium">Comissão</th>
                    <th className="p-4 font-medium">Cliques</th>
                    <th className="p-4 font-medium">Vendas</th>
                    <th className="p-4 font-medium">Ganhos</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map((a, i) => (
                    <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-semibold text-muted-foreground">{i + 1}</td>
                      <td className="p-4 font-medium">{a.affiliate_name}</td>
                      <td className="p-4 text-muted-foreground">{a.product_title}</td>
                      <td className="p-4">{a.commission_percent}%</td>
                      <td className="p-4">{a.clicks}</td>
                      <td className="p-4">{a.sales}</td>
                      <td className="p-4 font-semibold">{formatCurrency(a.commission_earned, currency)}</td>
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
