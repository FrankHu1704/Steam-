import Link from "next/link";
import { Gift, PackageCheck, TrendingUp, Users2, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MarkPrizeDeliveredButton } from "@/components/admin/mark-prize-delivered-button";
import { getPendingPrizeDeliveries, getDeliveredPrizes, getPrizesSummary } from "@/lib/data/prizes";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPrizesPage() {
  const [pending, delivered, summary] = await Promise.all([
    getPendingPrizeDeliveries(),
    getDeliveredPrizes(),
    getPrizesSummary(),
  ]);

  const summaryTiles = [
    {
      label: "Faturamento de todos os produtores",
      value: formatCurrency(summary.platformLifetimeRevenue, "MZN"),
      icon: TrendingUp,
      style: "bg-primary/10 text-primary",
    },
    {
      label: "Produtores premiados",
      value: String(summary.producersWithAtLeastOnePrize),
      icon: Users2,
      style: "bg-violet-500/10 text-violet-600",
    },
    {
      label: "Prémios entregues",
      value: String(summary.totalDelivered),
      icon: PackageCheck,
      style: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Prémios por entregar",
      value: String(summary.totalPending),
      icon: Gift,
      style: "bg-amber-500/10 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Premiações</h1>
        <p className="text-sm text-muted-foreground">
          Resumo de tudo já conquistado na plataforma, e produtores que ainda aguardam o prémio físico (agenda ou
          placa PayNow).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryTiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tile.style}`}>
                  <tile.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Award className="h-4 w-4" /> Por patamar
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.byTier.map((t) => (
            <Card key={t.tier.key}>
              <CardContent className="p-5">
                <p className="text-sm font-medium">
                  {t.tier.icon} {t.tier.prize}
                </p>
                <p className="text-xs text-muted-foreground">A partir de {t.tier.label}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{t.producersEarned}</p>
                  <p className="text-xs text-muted-foreground">produtor{t.producersEarned === 1 ? "" : "es"}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.delivered} entregue{t.delivered === 1 ? "" : "s"} · {t.pending} por entregar
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">Por entregar</h2>
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
