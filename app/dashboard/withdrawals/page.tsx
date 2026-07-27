import Link from "next/link";
import { Zap, Wallet, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { WithdrawalForm } from "@/components/withdrawals/withdrawal-form";
import { WalletManager } from "@/components/withdrawals/wallet-manager";
import { WithdrawalsTabs } from "@/components/withdrawals/withdrawals-tabs";
import { ConfirmReceiptButton } from "@/components/withdrawals/confirm-receipt-button";
import { B2CPayoutButton } from "@/components/withdrawals/b2c-payout-button";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyWithdrawals, getWithdrawalFeePercent, getWithdrawalMinimumAmount } from "@/lib/data/withdrawals";
import { getPayoutWallets } from "@/lib/data/payout-wallets";
import { formatCurrency } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola" };

export default async function WithdrawalsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const [withdrawals, feePercent, minimumAmount, wallets] = await Promise.all([
    getMyWithdrawals(user.id),
    getWithdrawalFeePercent(),
    getWithdrawalMinimumAmount(),
    getPayoutWallets(user.id),
  ]);
  const currency = profile.currency as "MZN" | "ZAR";
  const canUseB2C = !!profile.production_unlocked_at;
  const defaultWallet = wallets.find((w) => w.is_default) ?? null;

  const b2cBanner = canUseB2C ? (
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
          Desbloqueie o modo produção da API para levantar via M-Pesa instantaneamente (B2C), sem esperar aprovação.
        </p>
      </div>
      <Link href="/dashboard/developer" className="shrink-0 text-sm font-medium text-primary hover:underline">
        Saber mais
      </Link>
    </div>
  );

  const overview = (
    <div className="space-y-6">
      {b2cBanner}

      <div className="overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Saldo Disponível</p>
        <p className="mt-2 text-4xl font-bold">
          {formatCurrency(profile.balance_available, currency)}
        </p>
        <p className="mt-1 text-sm text-white/80">Disponível para transferência imediata (M-Pesa / e-Mola).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Saque Mínimo</p>
              <p className="font-semibold">{formatCurrency(minimumAmount, currency)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Prazo de Processamento</p>
              <p className="font-semibold">{canUseB2C ? "Instantâneo (M-Pesa)" : "Até 24h úteis"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Carteira Padrão</p>
              <p className="font-semibold">
                {defaultWallet ? METHOD_LABEL[defaultWallet.method] : "Nenhuma"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold">Solicitar Saque</h2>
          <WithdrawalForm
            balanceAvailable={profile.balance_available}
            currency={profile.currency}
            feePercent={feePercent}
            minimumAmount={minimumAmount}
            wallets={wallets}
          />
        </CardContent>
      </Card>
    </div>
  );

  const history = (
    <Card>
      <CardContent className="p-0">
        {withdrawals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Histórico de Saques</p>
            <p className="text-sm text-muted-foreground">Nenhum saque realizado até o momento.</p>
          </div>
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
  );

  const accounts = <WalletManager wallets={wallets} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finanças & Saques</h1>
        <p className="text-sm text-muted-foreground">Cadastre suas carteiras e solicite transferências com um clique.</p>
      </div>

      <WithdrawalsTabs overview={overview} history={history} accounts={accounts} />
    </div>
  );
}
