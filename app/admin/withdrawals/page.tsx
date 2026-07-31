import { Wallet, Zap, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { WithdrawalReviewActions } from "@/components/admin/withdrawal-review-actions";
import { ManualB2CForm } from "@/components/admin/manual-b2c-form";
import { ProcessorSelect } from "@/components/admin/processor-select";
import { getAllWithdrawals, getB2CHistory } from "@/lib/data/admin";
import { getActivePaymentProvider, providerModule, b2cMethodsForProvider, type PaymentProviderName } from "@/lib/payments";
import { formatCurrency } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola" };
const PROVIDER_LABEL: Record<PaymentProviderName, string> = {
  zumbopay: "ZumboPay",
  debito_pay: "Debito Pay",
  netshop: "NetShop",
};
const ALL_PROVIDERS: PaymentProviderName[] = ["debito_pay", "zumbopay", "netshop"];

export default async function AdminWithdrawalsPage() {
  const providerName = await getActivePaymentProvider();
  const [withdrawals, walletsByProvider, b2cHistory] = await Promise.all([
    getAllWithdrawals(),
    Promise.all(ALL_PROVIDERS.map((p) => providerModule(p).getWalletBalances().catch(() => []))),
    getB2CHistory(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saques & B2C</h1>
        <p className="text-sm text-muted-foreground">Aprove, pague ou rejeite pedidos de levantamento.</p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Processador ativo</h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-6">
            <ProcessorSelect active={providerName} />
            <p className="text-xs text-muted-foreground">
              Define qual processador é usado no checkout e nos levantamentos automáticos (B2C) da PagaJá.
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Saldos por processador</h2>
        <div className="space-y-4">
          {ALL_PROVIDERS.map((p, i) => {
            const wallets = walletsByProvider[i];
            return (
              <div key={p}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm font-medium">{PROVIDER_LABEL[p]}</p>
                  {p === providerName && <Badge variant="success">Ativo</Badge>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {wallets.length === 0 ? (
                    <Card className="sm:col-span-2">
                      <CardContent className="p-6 text-sm text-muted-foreground">
                        {p === "netshop"
                          ? "O NetShop não disponibiliza consulta de saldo pela API pública — verifique o saldo diretamente no painel deles."
                          : `Não foi possível obter o saldo do ${PROVIDER_LABEL[p]} agora — verifique se as chaves de API estão configuradas.`}
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
                              {w.balance != null
                                ? formatCurrency(w.balance, (w.currency as "MZN" | "ZAR") ?? "MZN")
                                : "Indisponível"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
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

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Zap className="h-4 w-4" /> Histórico de B2C
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Todas as tentativas de pagamento instantâneo via B2C — automáticas ou manuais, com sucesso ou falha.
        </p>
        <Card>
          <CardContent className="p-0">
            {b2cHistory.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Zap className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Ainda não há tentativas de B2C registadas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="p-4 font-medium">Tipo</th>
                      <th className="p-4 font-medium">Produtor / Destino</th>
                      <th className="p-4 font-medium">Valor</th>
                      <th className="p-4 font-medium">Método</th>
                      <th className="p-4 font-medium">Processador</th>
                      <th className="p-4 font-medium">Resultado</th>
                      <th className="p-4 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b2cHistory.map((attempt) => (
                      <tr key={attempt.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                        <td className="p-4">
                          <Badge variant={attempt.manual ? "secondary" : "default"}>
                            {attempt.manual ? "Manual" : "Levantamento"}
                          </Badge>
                        </td>
                        <td className="p-4 font-medium">
                          {attempt.manual ? (
                            <>
                              {attempt.destination ?? "—"}
                              {attempt.note && <span className="block text-xs font-normal text-muted-foreground">{attempt.note}</span>}
                            </>
                          ) : (
                            attempt.producerName
                          )}
                        </td>
                        <td className="p-4">{formatCurrency(attempt.netAmount, attempt.currency as "MZN" | "ZAR")}</td>
                        <td className="p-4 capitalize text-muted-foreground">
                          {METHOD_LABEL[attempt.payoutMethod] ?? attempt.payoutMethod}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {PROVIDER_LABEL[attempt.provider as PaymentProviderName] ?? attempt.provider}
                        </td>
                        <td className="p-4">
                          {attempt.success ? (
                            <span className="flex items-center gap-1.5 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Pago{attempt.reference ? ` · ${attempt.reference}` : ""}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-red-600" title={attempt.error ?? undefined}>
                              <XCircle className="h-3.5 w-3.5" /> Falhou{attempt.error ? ` · ${attempt.error}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(attempt.created_at).toLocaleString("pt-MZ")}
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
