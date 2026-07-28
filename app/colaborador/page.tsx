import { redirect } from "next/navigation";
import { MousePointerClick, UserPlus, Rocket, Wallet, Info, User, Phone, MapPin, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getEmployeeByUserId, getEmployeeOverview } from "@/lib/data/employees";
import { ReferralLinkCard } from "@/components/employees/referral-link-card";
import { cn, formatCurrency } from "@/lib/utils";

function nextPayoutDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString("pt-MZ", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function ColaboradorOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/colaborador/login");

  const employee = await getEmployeeByUserId(user.id);
  if (!employee) redirect("/colaborador/login");

  const overview = await getEmployeeOverview(employee.id);
  const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || "https://pagaja.site"}/signup?ref=${employee.referral_code}`;

  const tiles = [
    { label: "Cliques no link", value: overview.clicksCount, icon: MousePointerClick, style: "bg-primary/10 text-primary" },
    {
      label: "Produtores registados",
      value: overview.registeredCount,
      icon: UserPlus,
      style: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "A produzir (com produtos aprovados)",
      value: overview.producingCount,
      icon: Rocket,
      style: "bg-emerald-500/10 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Olá, {employee.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">
          Ganha {employee.commission_percent}% sobre as vendas dos produtores que recrutar, durante os primeiros 3
          meses de cada um.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-lg lg:col-span-1">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Saldo por pagar</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="relative mt-3 text-3xl font-bold">{formatCurrency(employee.balance_available, "MZN")}</p>
          <p className="relative mt-1 text-xs text-white/70">Próximo pagamento: {nextPayoutDate()}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          {tiles.map((tile) => (
            <Card key={tile.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tile.style)}>
                    <tile.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold">{tile.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ReferralLinkCard link={referralLink} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" /> Como funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Partilhe o seu link único com potenciais produtores.</p>
            <p>
              • Ganha {employee.commission_percent}% sobre cada venda que esse produtor fizer, durante os primeiros 3
              meses a partir do registo dele.
            </p>
            <p>• O saldo acumulado é pago automaticamente todo dia 1 do mês, via M-Pesa.</p>
            <p>• "A produzir" conta produtores recrutados que já têm pelo menos um produto aprovado.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" /> Os meus dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" /> {employee.phone ?? "—"}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {employee.address ? `${employee.address}, ${employee.city}, ${employee.province}` : "—"}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              {[
                employee.mpesa_number && `M-Pesa: ${employee.mpesa_number}`,
                employee.emola_number && `e-Mola: ${employee.emola_number}`,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Encontrou algum dado errado? Contacte o administrador da PagaJá para corrigir.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimentos recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.recentCommissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Ainda não tem comissões registadas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Produtor</th>
                    <th className="pb-2 font-medium">Produto</th>
                    <th className="pb-2 font-medium">Comissão</th>
                    <th className="pb-2 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentCommissions.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 font-medium">{c.producerName}</td>
                      <td className="py-2.5 text-muted-foreground">{c.productTitle}</td>
                      <td className="py-2.5">{formatCurrency(c.amount, "MZN")}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("pt-MZ")}
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
  );
}
