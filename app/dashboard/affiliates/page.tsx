import { Users2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getProducerAffiliates } from "@/lib/data/affiliates";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardAffiliatesPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const affiliates = await getProducerAffiliates(user.id);
  const currency = profile.currency as "MZN" | "ZAR";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Afiliados</h1>
        <p className="text-sm text-muted-foreground">Pessoas a promover os seus produtos, ordenadas por comissão gerada.</p>
      </div>

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
                    <tr key={a.id} className="border-b border-border/60 last:border-0">
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
