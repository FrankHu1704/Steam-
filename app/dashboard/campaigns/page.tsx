import { Megaphone, FileText, CheckCircle2, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getCampaignBreakdown } from "@/lib/data/campaigns";
import { cn, formatCurrency } from "@/lib/utils";

export default async function CampaignsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const rows = await getCampaignBreakdown(user.id);
  const currency = profile.currency as "MZN" | "ZAR";

  const totalOrders = rows.reduce((sum, r) => sum + r.orders, 0);
  const totalPaidOrders = rows.reduce((sum, r) => sum + r.paidOrders, 0);
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);

  const tiles = [
    { label: "Pedidos", value: totalOrders, icon: FileText, style: "bg-primary/10 text-primary" },
    { label: "Vendas pagas", value: totalPaidOrders, icon: CheckCircle2, style: "bg-emerald-500/10 text-emerald-600" },
    { label: "Receita", value: formatCurrency(totalRevenue, currency), icon: Coins, style: "bg-violet-500/10 text-violet-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <p className="text-sm text-muted-foreground">
          Vendas por origem/UTM — adicione <code>?utm_source=...&amp;utm_medium=...&amp;utm_campaign=...</code> ao
          link do seu produto para rastrear os seus anúncios.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
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
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Ainda não há vendas com UTMs registados.</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Exemplo de link: <code>pagaja.vercel.app/p/o-seu-produto?utm_source=facebook&utm_medium=cpc&utm_campaign=lancamento</code>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Origem (utm_source)</th>
                    <th className="p-4 font-medium">Meio (utm_medium)</th>
                    <th className="p-4 font-medium">Campanha (utm_campaign)</th>
                    <th className="p-4 font-medium">Cliques → Pedidos</th>
                    <th className="p-4 font-medium">Vendas Pagas</th>
                    <th className="p-4 font-medium">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-medium">{row.source}</td>
                      <td className="p-4 text-muted-foreground">{row.medium}</td>
                      <td className="p-4 text-muted-foreground">{row.campaign}</td>
                      <td className="p-4">{row.orders}</td>
                      <td className="p-4">{row.paidOrders}</td>
                      <td className="p-4 font-semibold">{formatCurrency(row.revenue, currency)}</td>
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
