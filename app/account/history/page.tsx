import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { getMyOrders } from "@/lib/data/buyer";
import { formatCurrency } from "@/lib/utils";

const SHIPPING_LABELS: Record<string, string> = {
  pending: "Pendente",
  processing: "Em preparação",
  shipped: "Enviado",
  delivered: "Entregue",
  returned: "Devolvido",
};

export default async function HistoryPage() {
  const orders = await getMyOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico de Compras</h1>
        <p className="text-sm text-muted-foreground">Todas as suas encomendas, incluindo pendentes e falhadas.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Ainda não tem encomendas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Produto</th>
                    <th className="p-4 font-medium">Valor</th>
                    <th className="p-4 font-medium">Método</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Envio</th>
                    <th className="p-4 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-border/60 last:border-0">
                      <td className="p-4 font-medium">{order.product_title}</td>
                      <td className="p-4">{formatCurrency(order.total_amount, order.currency as "MZN" | "ZAR")}</td>
                      <td className="p-4 capitalize text-muted-foreground">
                        {order.payment_method?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {order.shipping_status ? SHIPPING_LABELS[order.shipping_status] : "—"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-MZ")}
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
