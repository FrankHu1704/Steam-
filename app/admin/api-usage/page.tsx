import { Code2, KeyRound, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getApiUsageSummary } from "@/lib/data/admin";

export default async function AdminApiUsagePage() {
  const usage = await getApiUsageSummary();

  const tiles = [
    { label: "Chaves ativas", value: usage.activeKeys, icon: KeyRound },
    { label: "Chaves live", value: usage.liveKeys, icon: KeyRound },
    { label: "Chamadas (30 dias)", value: usage.callsLast30Days, icon: Activity },
    { label: "Produtores com chaves", value: usage.producers.length, icon: Code2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Uso da API de Programador</h1>
        <p className="text-sm text-muted-foreground">
          Chaves ativas, produtores a usar a API pública, e chamadas recentes a /api/v1/*.
        </p>
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

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Produtores</h2>
          </div>
          {usage.producers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Ninguém criou chaves de API ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Produtor</th>
                    <th className="p-4 font-medium">Chaves de teste</th>
                    <th className="p-4 font-medium">Chaves live</th>
                    <th className="p-4 font-medium">Chamadas (30 dias)</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.producers.map((p) => (
                    <tr key={p.producerId} className="border-b border-border/60 last:border-0">
                      <td className="p-4 font-medium">
                        {p.producerName}
                        <div className="text-xs font-normal text-muted-foreground">{p.producerEmail}</div>
                      </td>
                      <td className="p-4">{p.testKeys}</td>
                      <td className="p-4">{p.liveKeys}</td>
                      <td className="p-4">{p.callsLast30Days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Chamadas recentes</h2>
          </div>
          {usage.recentCalls.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma chamada registada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Endpoint</th>
                    <th className="p-4 font-medium">Método</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.recentCalls.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="p-4 font-mono text-xs">{c.endpoint}</td>
                      <td className="p-4">{c.method}</td>
                      <td className="p-4">
                        <span
                          className={
                            c.status_code < 300
                              ? "text-emerald-600"
                              : c.status_code < 500
                                ? "text-amber-600"
                                : "text-destructive"
                          }
                        >
                          {c.status_code}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-MZ")}</td>
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
