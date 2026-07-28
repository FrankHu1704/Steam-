import { Zap, Wallet, TrendingUp, Clock, CreditCard, AlertTriangle } from "lucide-react";
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
import { getActivePaymentProvider, b2cMethodsForProvider } from "@/lib/payments";
import { formatCurrency } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola" };

export default async function WithdrawalsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const [withdrawals, feePercent, minimumAmount, wallets, providerName] = await Promise.all([
    getMyWithdrawals(user.id),
    getWithdrawalFeePercent(),
    getWithdrawalMinimumAmount(),
    getPayoutWallets(user.id),
    getActivePaymentProvider(),
  ]);
  const currency = profile.currency as "MZN" | "ZAR";
  const instantMethods = b2cMethodsForProvider(providerName);
  const canUseB2C = instantMethods.length > 0;
  const defaultWallet = wallets.find((w) => w.is_default) ?? null;

  const b2cBanner = (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
      <Zap className="h-5 w-5 shrink-0 text-emerald-600" />
      <p className="text-emerald-900 dark:text-emerald-200">
        Os seus levantamentos são pagos automaticamente por B2C assim que os pedir (
        {instantMethods.map((m) => METHOD_LABEL[m] ?? m).join(" e ")}) — sem esperar aprovação.
      </p>
    </div>
  );

  const negativeBalanceBanner = profile.balance_available < 0 && (
    <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <p className="text-destructive">
        O seu saldo está negativo — uma ou mais vendas já pagas foram reembolsadas/estornadas depois de já terem sido
        creditadas. O valor em falta será descontado automaticamente das próximas vendas.
      </p>
    </div>
  );

  const overview = (
    <div className="space-y-6">
      {negativeBalanceBanner}
      {b2cBanner}

      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-2 text-sm font-medium text-white/80">
          <Wallet className="h-4 w-4" /> Olá {profile.name.split(" ")[0]}, o seu saldo disponível é de
        </div>
        <p className="relative mt-2 text-4xl font-bold sm:text-5xl">
          {formatCurrency(profile.balance_available, currency)}
        </p>
        <p className="relative mt-1 text-sm text-white/70">Pronto para transferência imediata via M-Pesa ou e-Mola.</p>

        <div className="relative mt-6 grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-4">
          <div className="flex items-center gap-2 pr-3">
            <TrendingUp className="h-4 w-4 shrink-0 text-white/70" />
            <div>
              <p className="text-[11px] text-white/60">Mínimo</p>
              <p className="text-sm font-semibold">{formatCurrency(minimumAmount, currency)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3">
            <Clock className="h-4 w-4 shrink-0 text-white/70" />
            <div>
              <p className="text-[11px] text-white/60">Prazo</p>
              <p className="text-sm font-semibold">{canUseB2C ? "Instantâneo" : "Até 24h"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-3">
            <CreditCard className="h-4 w-4 shrink-0 text-white/70" />
            <div>
              <p className="text-[11px] text-white/60">Padrão</p>
              <p className="text-sm font-semibold">{defaultWallet ? METHOD_LABEL[defaultWallet.method] : "Nenhuma"}</p>
            </div>
          </div>
        </div>
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
                      {w.status === "pending" && (instantMethods as readonly string[]).includes(w.payout_method) && (
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
