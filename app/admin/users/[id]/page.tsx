import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { AdminDeleteProductButton } from "@/components/admin/admin-delete-product-button";
import { PrivateMessageForm } from "@/components/admin/private-message-form";
import { getUserDetail } from "@/lib/data/admin";
import { formatCurrency } from "@/lib/utils";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { profile, products, ordersAsProducer, purchasesAsBuyer, withdrawals } = detail;
  const currency = profile.currency as "MZN" | "ZAR";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar aos utilizadores
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{profile.name}</h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="font-medium">{profile.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo disponível</p>
            <p className="font-medium">{formatCurrency(profile.balance_available, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo pendente</p>
            <p className="font-medium">{formatCurrency(profile.balance_pending, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Membro desde</p>
            <p className="font-medium">{new Date(profile.created_at).toLocaleDateString("pt-MZ")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email verificado</p>
            <p className="font-medium">{profile.email_verified ? "Sim" : "Não"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">API produção</p>
            <p className="font-medium">{profile.production_unlocked_at ? "Desbloqueada" : "Bloqueada"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Papel</p>
            <UserRoleSelect userId={profile.id} role={profile.role} />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold">Enviar mensagem privada</h2>
        <Card>
          <CardContent className="p-6">
            <PrivateMessageForm userId={profile.id} userName={profile.name} />
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
                      <AdminDeleteProductButton productId={p.id} salesCount={p.sales_count} />
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
                      <tr key={o.id} className="border-b border-border/60 last:border-0">
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
                      <th className="p-3 font-medium">Valor</th>
                      <th className="p-3 font-medium">Líquido</th>
                      <th className="p-3 font-medium">Método</th>
                      <th className="p-3 font-medium">Estado</th>
                      <th className="p-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="border-b border-border/60 last:border-0">
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
                      <tr key={o.id} className="border-b border-border/60 last:border-0">
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
