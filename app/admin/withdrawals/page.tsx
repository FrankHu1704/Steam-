import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { WithdrawalReviewActions } from "@/components/admin/withdrawal-review-actions";
import { getAllWithdrawals } from "@/lib/data/admin";
import { formatCurrency } from "@/lib/utils";

export default async function AdminWithdrawalsPage() {
  const withdrawals = await getAllWithdrawals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saques</h1>
        <p className="text-sm text-muted-foreground">Aprove, pague ou rejeite pedidos de levantamento.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {withdrawals.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nenhum levantamento pedido ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{w.producer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(w.net_amount, w.currency as "MZN" | "ZAR")} líquido ·{" "}
                      {w.payout_method.replace(/_/g, " ")} · {w.destination}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={w.status} />
                    <WithdrawalReviewActions withdrawalId={w.id} status={w.status} payoutMethod={w.payout_method} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
