import Link from "next/link";
import { Percent, Wallet, ArrowDownToLine } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Taxas — PagaJá",
  description: "Entenda as taxas da PagaJá: comissão por venda, taxa de saque e valor mínimo de levantamento.",
};

export default async function TaxasPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["platform_fee_percent", "withdrawal_fee_percent", "withdrawal_minimum_amount"]);

  const platformFee = Number(settings?.find((s) => s.key === "platform_fee_percent")?.value ?? 10);
  const withdrawalFee = Number(settings?.find((s) => s.key === "withdrawal_fee_percent")?.value ?? 5);
  const minimumWithdrawal = Number(settings?.find((s) => s.key === "withdrawal_minimum_amount")?.value ?? 150);

  const items = [
    {
      icon: Percent,
      title: "Sobre Vendas Realizadas",
      value: `${platformFee}%`,
      youReceive: 100 - platformFee,
      description:
        "Cobrada apenas quando um produto é vendido com sucesso. Descontada automaticamente do valor da venda antes de entrar no seu saldo disponível.",
    },
    {
      icon: ArrowDownToLine,
      title: "Sobre Saques Solicitados",
      value: `${withdrawalFee}%`,
      youReceive: 100 - withdrawalFee,
      description:
        "Cobrada sobre o valor pedido no levantamento, para cobrir os custos de transferência para M-Pesa, e-Mola, mKesh ou conta bancária.",
    },
    {
      icon: Wallet,
      title: "Valor mínimo para saque",
      value: formatCurrency(minimumWithdrawal, "MZN"),
      youReceive: null,
      description: "O valor mínimo que pode pedir para levantar do seu saldo disponível de cada vez.",
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold">
          Taxas da <span className="text-gradient">PagaJá</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Transparência total: sem custos escondidos, sem mensalidades. Só cobramos quando você vende.
        </p>

        <div className="mt-10 space-y-4">
          {items.map((item) => (
            <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-lg font-bold text-primary">{item.value}</p>
                </div>
                {item.youReceive != null && (
                  <p className="mt-0.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Você recebe {item.youReceive}%
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Exemplo prático</p>
          <p className="mt-2">
            Vendeu um produto por 1.000 MT? A taxa de {platformFee}% ({formatCurrency((1000 * platformFee) / 100, "MZN")})
            é descontada automaticamente, e {formatCurrency(1000 - (1000 * platformFee) / 100, "MZN")} ficam no seu saldo
            disponível. Ao pedir um saque de {formatCurrency(1000 - (1000 * platformFee) / 100, "MZN")}, a taxa de{" "}
            {withdrawalFee}% é descontada e você recebe o restante na sua conta.
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
