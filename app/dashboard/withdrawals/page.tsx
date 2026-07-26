import Link from "next/link";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { WithdrawalForm } from "@/components/withdrawals/withdrawal-form";
import { ConfirmReceiptButton } from "@/components/withdrawals/confirm-receipt-button";
import { B2CPayoutButton } from "@/components/withdrawals/b2c-payout-button";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyWithdrawals, getWithdrawalFeePercent, getWithdrawalMinimumAmount } from "@/lib/data/withdrawals";
import { formatCurrency } from "@/lib/utils";

export default async function WithdrawalsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const [withdrawals, feePercent, minimumAmount] = await Promise.all([
    getMyWithdrawals(user.id),
    getWithdrawalFeePercent(),
    getWithdrawalMinimumAmount(),
  ]);
  const currency = profile.currency as "MZN" | "ZAR";
  const canUseB2C = !!profile.production_unlocked_at;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saques</h1>
        <p className="text-sm text-muted-foreground">Peça o levantamento do seu saldo disponível.</p>
      </div>

      {canUseB2C ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <Zap className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-emerald-900 dark:text-emerald-200">
            Tem levantamento instantâneo via B2C ativo para M-Pesa — clique em &quot;Levantar agora (B2C)&quot; em
            qualquer pedido pendente.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              Desbloqueie o modo produção da API para levantar via M-Pesa instantaneamente (B2C), sem esperar
              aprovação.
            </p>
          </div>
          <Link href="/dashboard/developer" className="shrink-0 text-sm font-medium text-primary hover:underline">
            Saber mais
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Novo levantamento</CardTitle>
          </CardHeader>
          <CardContent>
            <WithdrawalForm
              balanceAvailable={profile.balance_available}
              currency={profile.currency}
              feePercent={feePercent}
              minimumAmount={minimumAmount}
            />
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
                        <td className="p-4">
                          {w.status === "paid" && <ConfirmReceiptButton withdrawalId={w.id} />}
                          {w.status === "pending" && canUseB2C && w.payout_method === "mpesa" && (
                            <B2CPayoutButton withdrawalId={w.id} />
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
    </div>
  );
}
