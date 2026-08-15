import Link from "next/link";
import { ShoppingCart, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { MarkPaidButton } from "@/components/admin/mark-paid-button";
import { MarkFailedButton } from "@/components/admin/mark-failed-button";
import { MarkRefundedButton } from "@/components/admin/mark-refunded-button";
import { getAllOrders } from "@/lib/data/admin";
import { cn, formatCurrency } from "@/lib/utils";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const orders = await getAllOrders();
  const activeStatus = status ?? "";

  const paid = orders.filter((o) => o.status === "paid");
  const pending = orders.filter((o) => o.status === "pending");
  const failed = orders.filter((o) => o.status === "failed");
  const sum = (rows: typeof orders) => rows.reduce((total, o) => total + o.total_amount, 0);

  const filters = [
    {
      label: "Total",
      value: "",
      icon: ShoppingCart,
      style: "bg-primary/10 text-primary",
      count: orders.length,
      amount: sum(orders),
    },
    {
      label: "Sucesso",
      value: "paid",
      icon: CheckCircle2,
      style: "bg-emerald-500/10 text-emerald-600",
      count: paid.length,
      amount: sum(paid),
    },
    {
      label: "Pendentes",
      value: "pending",
      icon: Clock,
      style: "bg-amber-500/10 text-amber-600",
      count: pending.length,
      amount: sum(pending),
    },
    {
      label: "Erro",
      value: "failed",
      icon: XCircle,
      style: "bg-red-500/10 text-red-600",
      count: failed.length,
      amount: sum(failed),
    },
  ];

  const filteredOrders = activeStatus ? orders.filter((o) => o.status === activeStatus) : orders;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Últimas {orders.length} encomendas na plataforma.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filters.map((f) => (
          <Link key={f.label} href={f.value ? `/admin/orders?status=${f.value}` : "/admin/orders"}>
            <Card
              className={cn(
                "transition-colors hover:border-primary/40",
                activeStatus === f.value && "border-primary/60 ring-1 ring-primary/30"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{f.label}</p>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", f.style)}>
                    <f.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold">{f.count}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(f.amount, "MZN")}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Produto</th>
                    <th className="p-4 font-medium">Origem</th>
                    <th className="p-4 font-medium">Cliente</th>
                    <th className="p-4 font-medium">Valor</th>
                    <th className="p-4 font-medium">Método</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-medium">
                        <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                          {order.product_title}
                        </Link>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">{order.source === "api" ? "via API" : "Marketplace"}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{order.buyer_name}</td>
                      <td className="p-4 font-semibold">
                        {formatCurrency(order.total_amount, order.currency as "MZN" | "ZAR")}
                      </td>
                      <td className="p-4 capitalize text-muted-foreground">
                        {order.payment_method?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="p-4 whitespace-nowrap text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-MZ", { timeZone: "Africa/Maputo" })}{" "}
                        {new Date(order.created_at).toLocaleTimeString("pt-MZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Africa/Maputo",
                        })}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {order.status === "pending" && (
                            <>
                              <MarkPaidButton orderId={order.id} />
                              <MarkFailedButton orderId={order.id} />
                            </>
                          )}
                          {order.status === "paid" && <MarkRefundedButton orderId={order.id} />}
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex items-center rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            Detalhes
                          </Link>
                        </div>
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
