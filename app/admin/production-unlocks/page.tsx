import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { MarkUnlockPaidButton } from "@/components/admin/mark-unlock-paid-button";
import { RecheckUnlockButton } from "@/components/admin/recheck-unlock-button";
import { getAllProductionUnlocks } from "@/lib/data/admin";
import { formatCurrency } from "@/lib/utils";

export default async function AdminProductionUnlocksPage() {
  const unlocks = await getAllProductionUnlocks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produção API</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos de desbloqueio do modo produção (300 MT) para o checkout personalizado dos produtores.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {unlocks.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nenhum pedido de desbloqueio ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Produtor</th>
                    <th className="p-4 font-medium">Valor</th>
                    <th className="p-4 font-medium">Processador</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Pedido em</th>
                    <th className="p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {unlocks.map((u) => (
                    <tr key={u.id} className="border-b border-border/60 last:border-0">
                      <td className="p-4 font-medium">
                        {u.producer_name}
                        <div className="text-xs font-normal text-muted-foreground">{u.producer_email}</div>
                      </td>
                      <td className="p-4">{formatCurrency(u.amount, u.currency as "MZN" | "ZAR")}</td>
                      <td className="p-4 capitalize text-muted-foreground">{u.provider.replace(/_/g, " ")}</td>
                      <td className="p-4">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("pt-MZ")}
                      </td>
                      <td className="p-4">
                        {u.status === "pending" && (
                          <div className="flex items-center justify-end gap-1">
                            <RecheckUnlockButton unlockId={u.id} />
                            <MarkUnlockPaidButton unlockId={u.id} />
                          </div>
                        )}
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
  );
}
