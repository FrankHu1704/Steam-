import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { MarkPaidButton } from "@/components/admin/mark-paid-button";
import { MarkFailedButton } from "@/components/admin/mark-failed-button";
import { MarkRefundedButton } from "@/components/admin/mark-refunded-button";
import { getAllOrders } from "@/lib/data/admin";
import { formatCurrency } from "@/lib/utils";

export default async function AdminOrdersPage() {
  const orders = await getAllOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Últimas {orders.length} encomendas na plataforma.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Produto</th>
                  <th className="p-4 font-medium">Cliente</th>
                  <th className="p-4 font-medium">Valor</th>
                  <th className="p-4 font-medium">Método</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/60 last:border-0">
                    <td className="p-4 font-medium">{order.product_title}</td>
                    <td className="p-4 text-muted-foreground">{order.buyer_name}</td>
                    <td className="p-4">{formatCurrency(order.total_amount, order.currency as "MZN" | "ZAR")}</td>
                    <td className="p-4 capitalize text-muted-foreground">
                      {order.payment_method?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-MZ")}
                    </td>
                    <td className="p-4">
                      {order.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <MarkPaidButton orderId={order.id} />
                          <MarkFailedButton orderId={order.id} />
                        </div>
                      )}
                      {order.status === "paid" && (
                        <div className="flex justify-end">
                          <MarkRefundedButton orderId={order.id} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
