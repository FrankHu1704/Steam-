import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { UserCtoToggle } from "@/components/admin/user-cto-toggle";
import { UserSuspendToggle } from "@/components/admin/user-suspend-toggle";
import { AdminBalanceAdjustForm } from "@/components/admin/admin-balance-adjust-form";
import { AdminDeleteProductButton } from "@/components/admin/admin-delete-product-button";
import { PrivateMessageForm } from "@/components/admin/private-message-form";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { ProductionAccessForm } from "@/components/admin/production-access-form";
import { getUserDetail } from "@/lib/data/admin";
import { hasActiveProductionAccess } from "@/lib/production-access";
import { tierForSalesCount } from "@/lib/data/achievements";
import { prizeProgressForRevenue, PRIZE_TIERS } from "@/lib/data/prizes";
import { formatCurrency, walletSourceLabel } from "@/lib/utils";

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const {
    profile,
    products,
    ordersAsProducer,
    purchasesAsBuyer,
    withdrawals,
    recruitedByEmployeeName,
    recruitedByProducerName,
    recruitedAffiliatesCount,
  } = detail;
  const currency = profile.currency as "MZN" | "ZAR";
  const productionAccess = hasActiveProductionAccess(profile);
  const level = tierForSalesCount(profile.lifetime_sales_count);
  const prizeProgress = prizeProgressForRevenue(profile.lifetime_revenue);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar aos utilizadores
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-base font-semibold text-white">
            {initials(profile.name)}
          </span>
          <div>
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="font-medium">{profile.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo Produtor</p>
            <p className="font-medium">{formatCurrency(profile.balance_available, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo Programador (API)</p>
            <p className="font-medium">{formatCurrency(profile.balance_available_dev, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Membro desde</p>
            <p className="font-medium">{new Date(profile.created_at).toLocaleDateString("pt-MZ")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vendas confirmadas</p>
            <p className="font-medium">{profile.lifetime_sales_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Faturamento total</p>
            <p className="font-medium">{formatCurrency(profile.lifetime_revenue, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nível</p>
            <p className="font-medium">
              {level.currentTier.icon} {level.currentTier.label}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email verificado</p>
            <Badge variant={profile.email_verified ? "success" : "secondary"}>
              {profile.email_verified ? "Sim" : "Não"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">API produção</p>
            <Badge variant={productionAccess ? "success" : "secondary"}>
              {profile.production_unlocked_at
                ? "Desbloqueada (permanente)"
                : productionAccess
                  ? "Ativa (temporária)"
                  : "Bloqueada"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Papel</p>
            <UserRoleSelect userId={profile.id} role={profile.role} />
          </div>
          {profile.role === "producer" && (
            <div>
              <p className="text-xs text-muted-foreground">CTO</p>
              <UserCtoToggle userId={profile.id} isCto={profile.is_cto} />
            </div>
          )}
        </CardContent>
      </Card>

      {profile.role !== "admin" && (
        <div>
          <h2 className="mb-3 font-semibold">Acesso à conta</h2>
          <Card>
            <CardContent className="p-6">
              <UserSuspendToggle
                userId={profile.id}
                suspended={Boolean(profile.suspended_at)}
                suspensionReason={profile.suspension_reason}
                fraudFlag={profile.fraud_flag}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-3 font-semibold">Ajustar saldo</h2>
        <Card>
          <CardContent className="p-6">
            <AdminBalanceAdjustForm userId={profile.id} currency={profile.currency} isCto={profile.is_cto} />
          </CardContent>
        </Card>
      </div>

      {(recruitedByEmployeeName || recruitedByProducerName || recruitedAffiliatesCount > 0) && (
        <div>
          <h2 className="mb-3 flex items-center gap-1.5 font-semibold">
            <UserPlus className="h-4 w-4" /> Recrutamento
          </h2>
          <Card>
            <CardContent className="space-y-1.5 p-6 text-sm">
              {recruitedByEmployeeName && (
                <p>
                  Registado através do link de recrutamento do colaborador <strong>{recruitedByEmployeeName}</strong>.
                </p>
              )}
              {recruitedByProducerName && (
                <p>
                  Registado através do link de afiliados do produtor <strong>{recruitedByProducerName}</strong>.
                </p>
              )}
              {recruitedAffiliatesCount > 0 && (
                <p>
                  Já trouxe <strong>{recruitedAffiliatesCount}</strong> afiliado{recruitedAffiliatesCount === 1 ? "" : "s"}{" "}
                  para a plataforma através do seu próprio link.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-3 font-semibold">Prémios físicos (faturamento)</h2>
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-muted-foreground">
              {prizeProgress.earnedTiers.length} de {PRIZE_TIERS.length} prémios ganhos — faturamento total{" "}
              {formatCurrency(prizeProgress.lifetimeRevenue, currency)}.
            </p>
            <div className="flex flex-wrap gap-2">
              {PRIZE_TIERS.map((tier) => {
                const earned = prizeProgress.earnedTiers.some((t) => t.key === tier.key);
                return (
                  <span
                    key={tier.key}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      earned ? "bg-brand-gradient text-white" : "bg-muted text-muted-foreground opacity-60"
                    }`}
                  >
                    {tier.icon} {tier.prize} ({tier.label})
                  </span>
                );
              })}
            </div>
            <Link href="/admin/prizes" className="inline-block text-xs font-medium text-primary hover:underline">
              Gerir entregas de prémios →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Enviar mensagem privada</h2>
        <Card>
          <CardContent className="p-6">
            <PrivateMessageForm userId={profile.id} userName={profile.name} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Redefinir senha</h2>
        <Card>
          <CardContent className="p-6">
            <ResetPasswordForm userId={profile.id} userName={profile.name} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Acesso de produção (API)</h2>
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-muted-foreground">
              {profile.production_unlocked_at ? (
                <>Desbloqueado permanentemente em {new Date(profile.production_unlocked_at).toLocaleDateString("pt-MZ")}.</>
              ) : productionAccess && profile.production_access_expires_at ? (
                <>Acesso temporário ativo até {new Date(profile.production_access_expires_at).toLocaleString("pt-MZ")}.</>
              ) : profile.production_access_expires_at ? (
                <>Acesso temporário expirou em {new Date(profile.production_access_expires_at).toLocaleString("pt-MZ")}.</>
              ) : (
                <>Sem acesso de produção — ativa aqui um período, sem precisar de pagamento.</>
              )}
            </p>
            <ProductionAccessForm userId={profile.id} hasAccess={productionAccess} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Produtos ({products.length})</h2>
        <Card>
          <CardContent className="p-0">
            {products.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum produto criado.</p>
            ) : (
              <div className="divide-y divide-border">
                {products.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(p.price, p.currency as "MZN" | "ZAR")} · {p.sales_count} venda
                        {p.sales_count === 1 ? "" : "s"}
                      </p>
                      {p.status === "approved" && (
                        <Link
                          href={`/p/${p.slug}`}
                          target="_blank"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Ver produto <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={p.status} />
                      <AdminDeleteProductButton productId={p.id} salesCount={p.sales_count} status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Vendas como produtor ({ordersAsProducer.length})</h2>
        <Card>
          <CardContent className="p-0">
            {ordersAsProducer.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma venda ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="p-3 font-medium">Produto</th>
                      <th className="p-3 font-medium">Comprador</th>
                      <th className="p-3 font-medium">Valor</th>
                      <th className="p-3 font-medium">Estado</th>
                      <th className="p-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersAsProducer.map((o) => (
                      <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                        <td className="p-3">{o.product_title}</td>
                        <td className="p-3 text-muted-foreground">{o.buyer_name}</td>
                        <td className="p-3">{formatCurrency(o.total_amount, o.currency as "MZN" | "ZAR")}</td>
                        <td className="p-3">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("pt-MZ")}
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

      <div>
        <h2 className="mb-3 font-semibold">Levantamentos ({withdrawals.length})</h2>
        <Card>
          <CardContent className="p-0">
            {withdrawals.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum levantamento pedido.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="p-3 font-medium">Carteira</th>
                      <th className="p-3 font-medium">Valor</th>
                      <th className="p-3 font-medium">Líquido</th>
                      <th className="p-3 font-medium">Método</th>
                      <th className="p-3 font-medium">Estado</th>
                      <th className="p-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">{walletSourceLabel(w.wallet_source)}</td>
                        <td className="p-3">{formatCurrency(w.amount, currency)}</td>
                        <td className="p-3">{formatCurrency(w.net_amount, currency)}</td>
                        <td className="p-3 text-muted-foreground">{w.payout_method}</td>
                        <td className="p-3">
                          <StatusBadge status={w.status} />
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(w.requested_at).toLocaleDateString("pt-MZ")}
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

      <div>
        <h2 className="mb-3 font-semibold">Compras feitas ({purchasesAsBuyer.length})</h2>
        <Card>
          <CardContent className="p-0">
            {purchasesAsBuyer.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma compra feita.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="p-3 font-medium">Produto</th>
                      <th className="p-3 font-medium">Valor</th>
                      <th className="p-3 font-medium">Estado</th>
                      <th className="p-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchasesAsBuyer.map((o) => (
                      <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                        <td className="p-3">{o.product_title}</td>
                        <td className="p-3">{formatCurrency(o.total_amount, o.currency as "MZN" | "ZAR")}</td>
                        <td className="p-3">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("pt-MZ")}
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
