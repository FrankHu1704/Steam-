import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { WithdrawalForm } from "@/components/withdrawals/withdrawal-form";
import { ConfirmReceiptButton } from "@/components/withdrawals/confirm-receipt-button";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyWithdrawals, getWithdrawalFeePercent } from "@/lib/data/withdrawals";
import { formatCurrency } from "@/lib/utils";

export default async function WithdrawalsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const [withdrawals, feePercent] = await Promise.all([getMyWithdrawals(user.id), getWithdrawalFeePercent()]);
  const currency = profile.currency as "MZN" | "ZAR";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saques</h1>
        <p className="text-sm text-muted-foreground">Peça o levantamento do seu saldo disponível.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Novo levantamento</CardTitle>
          </CardHeader>
          <CardContent>
            <WithdrawalForm balanceAvailable={profile.balance_available} currency={profile.currency} feePercent={feePercent} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de levantamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {withdrawals.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Ainda não fez nenhum levantamento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="p-4 font-medium">Valor</th>
                      <th className="p-4 font-medium">Líquido</th>
                      <th className="p-4 font-medium">Método</th>
                      <th className="p-4 font-medium">Estado</th>
                      <th className="p-4 font-medium">Data</th>
                      <th className="p-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="border-b border-border/60 last:border-0">
                        <td className="p-4">{formatCurrency(w.amount, currency)}</td>
                        <td className="p-4 font-medium">{formatCurrency(w.net_amount, currency)}</td>
                        <td className="p-4 capitalize text-muted-foreground">{w.payout_method.replace(/_/g, " ")}</td>
                        <td className="p-4">
                          <StatusBadge status={w.status} />
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(w.requested_at).toLocaleDateString("pt-MZ")}
                        </td>
                        <td className="p-4">{w.status === "paid" && <ConfirmReceiptButton withdrawalId={w.id} />}</td>
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
