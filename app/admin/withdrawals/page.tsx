import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { WithdrawalReviewActions } from "@/components/admin/withdrawal-review-actions";
import { ManualB2CForm } from "@/components/admin/manual-b2c-form";
import { getAllWithdrawals } from "@/lib/data/admin";
import { getActivePaymentProvider, providerModule, b2cMethodsForProvider, type PaymentProviderName } from "@/lib/payments";
import { formatCurrency } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola" };
const PROVIDER_LABEL: Record<PaymentProviderName, string> = {
  zumbopay: "ZumboPay",
  debito_pay: "Debito Pay",
  netshop: "NetShop",
};

export default async function AdminWithdrawalsPage() {
  const providerName = await getActivePaymentProvider();
  const [withdrawals, wallets] = await Promise.all([
    getAllWithdrawals(),
    providerModule(providerName).getWalletBalances().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saques & B2C</h1>
        <p className="text-sm text-muted-foreground">Aprove, pague ou rejeite pedidos de levantamento.</p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Saldo no {PROVIDER_LABEL[providerName]} (processador ativo)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {wallets.length === 0 ? (
            <Card className="sm:col-span-2">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Não foi possível obter o saldo do {PROVIDER_LABEL[providerName]} agora — verifique se as chaves de API
                estão configuradas.
              </CardContent>
            </Card>
          ) : (
            wallets.map((w) => (
              <Card key={w.walletId}>
                <CardContent className="flex items-center gap-4 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{METHOD_LABEL[w.method] ?? w.method}</p>
                    <p className="text-xl font-bold">
                      {w.balance != null ? formatCurrency(w.balance, (w.currency as "MZN" | "ZAR") ?? "MZN") : "Indisponível"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Enviar B2C manual</h2>
        <Card>
          <CardContent className="p-6">
            <ManualB2CForm
              providerLabel={PROVIDER_LABEL[providerName]}
              emolaSupported={b2cMethodsForProvider(providerName).includes("emola")}
            />
          </CardContent>
        </Card>
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
