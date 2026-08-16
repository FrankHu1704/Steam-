import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { getOrderDetail } from "@/lib/data/admin";
import { formatCurrency } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const currency = order.currency as "MZN" | "ZAR";
  // The payment that actually decided this order's fate — prefer a paid
  // one (there can be a failed attempt followed by a successful retry),
  // otherwise the most recent attempt (payments are already newest-first).
  const primaryPayment = order.payments.find((p) => p.status === "paid") ?? order.payments[0] ?? null;
  const utmEntries = [
    { label: "Fonte (utm_source)", value: order.utm_source },
    { label: "Meio (utm_medium)", value: order.utm_medium },
    { label: "Campanha (utm_campaign)", value: order.utm_campaign },
    { label: "Conteúdo (utm_content)", value: order.utm_content },
    { label: "Termo (utm_term)", value: order.utm_term },
  ].filter((e) => e.value);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos pedidos
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{order.product_title}</h1>
          <StatusBadge status={order.status} />
          <Badge variant="secondary">{order.source === "api" ? "via API" : "Marketplace"}</Badge>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Valor" value={formatCurrency(order.total_amount, currency)} />
          <Field label="Método" value={order.payment_method?.replace(/_/g, " ") ?? "—"} />
          <Field
            label="Processador (origem do pagamento)"
            value={primaryPayment ? primaryPayment.provider.replace(/_/g, " ") : "—"}
          />
          <Field
            label="Id da transação"
            value={
              <span className="font-mono text-xs">
                {primaryPayment?.provider_payment_id ?? primaryPayment?.reference ?? "—"}
              </span>
            }
          />
          <Field label="Criado em" value={new Date(order.created_at).toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })} />
          <Field label="Pago em" value={order.paid_at ? new Date(order.paid_at).toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" }) : "—"} />
          <Field label="Creditado em" value={order.credited_at ? new Date(order.credited_at).toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" }) : "—"} />
          <Field label="Taxa da PayNow" value={order.platform_fee_amount != null ? formatCurrency(order.platform_fee_amount, currency) : "—"} />
          {order.product_slug && (
            <div>
              <p className="text-xs text-muted-foreground">Link do checkout</p>
              <Link
                href={`/p/${order.product_slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Ver checkout <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cliente e produtor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Comprador</p>
            <Field label="Nome" value={order.buyer_name} />
            <Field label="Email" value={order.buyer_email} />
            <Field label="Telefone" value={order.buyer_phone ?? "—"} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Produtor</p>
            <Field label="Nome" value={order.producer_name} />
            <Field label="Email" value={order.producer_email} />
            <Link
              href={`/admin/users/${order.producer_id}`}
              className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
            >
              Ver perfil completo
            </Link>
          </div>
        </CardContent>
      </Card>

      {utmEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Origem do tráfego</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {utmEntries.map((e) => (
              <Field key={e.label} label={e.label} value={e.value} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tentativas de pagamento ({order.payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registo de pagamento encontrado.</p>
          ) : (
            order.payments.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize">{p.provider.replace(/_/g, " ")}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })}
                  </span>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    <span className="font-medium text-foreground">Referência:</span> {p.reference ?? "—"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Id no processador:</span>{" "}
                    {p.provider_payment_id ?? "—"}
                  </p>
                </div>
                {p.raw_response != null && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-primary">
                      Ver resposta do processador (motivo da falha, se houver)
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-3 text-[11px]">
                      {JSON.stringify(p.raw_response, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
