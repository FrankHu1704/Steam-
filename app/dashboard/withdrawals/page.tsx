import { Zap, Wallet, TrendingUp, Clock, CreditCard, AlertTriangle, Wrench, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { WithdrawalForm } from "@/components/withdrawals/withdrawal-form";
import { WalletManager } from "@/components/withdrawals/wallet-manager";
import { WithdrawalsTabs } from "@/components/withdrawals/withdrawals-tabs";
import { ConfirmReceiptButton } from "@/components/withdrawals/confirm-receipt-button";
import { B2CPayoutButton } from "@/components/withdrawals/b2c-payout-button";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import {
  getMyWithdrawals,
  getWithdrawalFeeFlat,
  getWithdrawalMinimumAmount,
  getWithdrawalsEnabled,
} from "@/lib/data/withdrawals";
import { getPayoutWallets } from "@/lib/data/payout-wallets";
import { getActivePaymentProvider, b2cMethodsForProvider } from "@/lib/payments";
import { formatCurrency, walletSourceLabel } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = { mpesa: "M-Pesa", emola: "e-Mola" };

export default async function WithdrawalsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const [withdrawals, feeFlat, minimumAmount, wallets, providerName, withdrawalsEnabled] = await Promise.all([
    getMyWithdrawals(user.id),
    getWithdrawalFeeFlat(),
    getWithdrawalMinimumAmount(),
    getPayoutWallets(user.id),
    getActivePaymentProvider(),
    getWithdrawalsEnabled(),
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

  const negativeBalanceBanner = (profile.balance_available < 0 || profile.balance_available_dev < 0) && (
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

      <div className={`grid gap-4 sm:grid-cols-2${profile.is_cto ? " lg:grid-cols-3" : ""}`}>
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-2 text-sm font-medium text-white/80">
            <Wallet className="h-4 w-4" /> Carteira Produtor
          </div>
          <p className="relative mt-2 text-3xl font-bold sm:text-4xl">
            {formatCurrency(profile.balance_available, currency)}
          </p>
          <p className="relative mt-1 text-xs text-white/70">Vendas dos seus produtos no marketplace PayNow.</p>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-2 text-sm font-medium text-white/80">
            <Wallet className="h-4 w-4" /> Carteira Programador (API)
          </div>
          <p className="relative mt-2 text-3xl font-bold sm:text-4xl">
            {formatCurrency(profile.balance_available_dev, currency)}
          </p>
          <p className="relative mt-1 text-xs text-white/70">Cobranças feitas através da sua própria app via API.</p>
        </div>
        {profile.is_cto && (
          <div className="relative overflow-hidden rounded-3xl bg-amber-600 p-6 text-white shadow-lg">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-2 text-sm font-medium text-white/80">
              <Wallet className="h-4 w-4" /> Carteira CTO
            </div>
            <p className="relative mt-2 text-3xl font-bold sm:text-4xl">
              {formatCurrency(profile.balance_available_cto, currency)}
            </p>
            <p className="relative mt-1 text-xs text-white/70">25% do lucro líquido da plataforma, creditado todo mês.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 pr-3">
          <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-[11px] text-muted-foreground">Mínimo</p>
            <p className="text-sm font-semibold">{formatCurrency(minimumAmount, currency)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-[11px] text-muted-foreground">Prazo</p>
            <p className="text-sm font-semibold">{canUseB2C ? "Instantâneo" : "Até 24h"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-3">
          <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-[11px] text-muted-foreground">Padrão</p>
            <p className="text-sm font-semibold">{defaultWallet ? METHOD_LABEL[defaultWallet.method] : "Nenhuma"}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 font-semibold">Solicitar Saque</h2>
          {withdrawalsEnabled ? (
            <WithdrawalForm
              balanceAvailable={profile.balance_available}
              balanceAvailableDev={profile.balance_available_dev}
              balanceAvailableCto={profile.is_cto ? profile.balance_available_cto : undefined}
              currency={profile.currency}
              feeFlat={feeFlat}
              minimumAmount={minimumAmount}
              wallets={wallets}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950">
              <Wrench className="h-8 w-8 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">Estamos em manutenção</p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  Os levantamentos estão temporariamente indisponíveis. O seu saldo continua seguro e disponível
                  assim que voltarmos.
                </p>
              </div>
              <a
                href="https://wa.me/258849311757"
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                <MessageCircle className="h-4 w-4" /> Falar com o suporte
              </a>
            </div>
          )}
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
                  <th className="p-4 font-medium">Carteira</th>
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
                    <td className="p-4 text-muted-foreground">{walletSourceLabel(w.wallet_source)}</td>
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
