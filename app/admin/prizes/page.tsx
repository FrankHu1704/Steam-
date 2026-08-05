import Link from "next/link";
import { Gift, PackageCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MarkPrizeDeliveredButton } from "@/components/admin/mark-prize-delivered-button";
import { getPendingPrizeDeliveries, getDeliveredPrizes } from "@/lib/data/prizes";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPrizesPage() {
  const [pending, delivered] = await Promise.all([getPendingPrizeDeliveries(), getDeliveredPrizes()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Premiações</h1>
        <p className="text-sm text-muted-foreground">
          Produtores que atingiram um valor de faturamento e ainda aguardam o prémio físico (agenda ou placa
          PagaJá).
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Gift className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum prémio por entregar no momento.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pending.map((p) => (
                <div key={`${p.producerId}:${p.tier.key}`} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-xl">
                      {p.tier.icon}
                    </span>
                    <div>
                      <Link href={`/admin/users/${p.producerId}`} className="font-medium hover:underline">
                        {p.producerName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {p.producerEmail} {p.producerPhone ? `· ${p.producerPhone}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Faturou {formatCurrency(p.lifetimeRevenue, "MZN")} — ganhou{" "}
                        <strong>{p.tier.prize}</strong> ({p.tier.label})
                      </p>
                    </div>
                  </div>
                  <MarkPrizeDeliveredButton producerId={p.producerId} tierKey={p.tier.key} prizeLabel={`${p.tier.prize} (${p.tier.label})`} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <PackageCheck className="h-4 w-4" /> Já entregues ({delivered.length})
        </h2>
        <Card>
          <CardContent className="p-0">
            {delivered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum prémio entregue ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="p-4 font-medium">Produtor</th>
                      <th className="p-4 font-medium">Prémio</th>
                      <th className="p-4 font-medium">Entregue em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delivered.map((d) => (
                      <tr key={d.id} className="border-b border-border/60 last:border-0">
                        <td className="p-4 font-medium">{d.producerName}</td>
                        <td className="p-4 text-muted-foreground">
                          {d.tier.icon} {d.tier.prize} ({d.tier.label})
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(d.deliveredAt).toLocaleDateString("pt-MZ")}
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
    </div>
  );
}
