import Link from "next/link";
import { Wallet, Package, Code2, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Preços claros — PayNow",
  description: "Entenda as taxas da PayNow: comissão por venda, taxa de saque, valor mínimo de levantamento e o custo do acesso à API.",
};

const PRODUCTION_UNLOCK_AMOUNT = 300;

export default async function TaxasPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["platform_fee_percent", "platform_fixed_fee_amount", "withdrawal_fee_flat", "withdrawal_minimum_amount"]);

  const platformFee = Number(settings?.find((s) => s.key === "platform_fee_percent")?.value ?? 10);
  const platformFixedFee = Number(settings?.find((s) => s.key === "platform_fixed_fee_amount")?.value ?? 0);
  const withdrawalFee = Number(settings?.find((s) => s.key === "withdrawal_fee_flat")?.value ?? 20);
  const minimumWithdrawal = Number(settings?.find((s) => s.key === "withdrawal_minimum_amount")?.value ?? 200);

  const saleFeeLabel = platformFixedFee > 0 ? `${platformFee}% + ${formatCurrency(platformFixedFee, "MZN")}` : `${platformFee}%`;

  return (
    <>
      <SiteNav />
      <main className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold">
          Preços <span className="text-gradient">claros</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Taxas visíveis, contas separadas. Produtos digitais e API têm contas separadas — assim sabe sempre quanto
          recebeu e qual taxa se aplica.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <Package className="h-5 w-5" />
              </div>
              <p className="font-semibold">Produtos digitais</p>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ao receber (venda)</span>
                <span className="font-bold text-primary">{saleFeeLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">No levantamento</span>
                <span className="font-bold text-primary">{formatCurrency(withdrawalFee, "MZN")}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              O registo do produto é gratuito — sem mensalidade, sem custo de listagem.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <Code2 className="h-5 w-5" />
              </div>
              <p className="font-semibold">Programador (API)</p>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ao receber (venda)</span>
                <span className="font-bold text-primary">{saleFeeLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">No levantamento</span>
                <span className="font-bold text-primary">{formatCurrency(withdrawalFee, "MZN")}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Mesmas taxas dos produtos digitais. A análise para activar o modo produção (chamadas reais à API) custa{" "}
              {formatCurrency(PRODUCTION_UNLOCK_AMOUNT, "MZN")}, paga uma única vez.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Valor mínimo para pedir um saque: <span className="font-semibold text-foreground">{formatCurrency(minimumWithdrawal, "MZN")}</span>.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Exemplo prático</p>
          <p className="mt-2">
            {(() => {
              const saleFee = Math.round(((1000 * platformFee) / 100 + platformFixedFee) * 100) / 100;
              const netSale = Math.round((1000 - saleFee) * 100) / 100;
              return (
                <>
                  Vendeu um produto por 1.000 MT? A taxa de {platformFee}%
                  {platformFixedFee > 0 ? ` + ${formatCurrency(platformFixedFee, "MZN")}` : ""} (
                  {formatCurrency(saleFee, "MZN")}) é descontada automaticamente, e {formatCurrency(netSale, "MZN")}{" "}
                  ficam no seu saldo disponível. Ao pedir um saque, a taxa fixa de{" "}
                  {formatCurrency(withdrawalFee, "MZN")} é descontada e você recebe o restante na sua conta.
                </>
              );
            })()}
          </p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-emerald-900 dark:text-emerald-200">
            Sem custos escondidos, sem mensalidades. Só cobramos quando você vende ou levanta.
          </p>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Tem dúvidas?{" "}
          <Link href="/#faq" className="font-medium text-primary hover:underline">
            Veja o FAQ
          </Link>{" "}
          ou entre em contacto connosco.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
