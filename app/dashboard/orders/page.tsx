import { ShoppingCart, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { OrdersTable } from "@/components/orders/orders-table";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getProducerOrders } from "@/lib/data/orders";
import { cn } from "@/lib/utils";

export default async function DashboardOrdersPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) return null;

  const orders = await getProducerOrders(user.id);

  const paidCount = orders.filter((o) => o.status === "paid").length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const failedCount = orders.filter((o) => o.status === "failed").length;

  const tiles = [
    { label: "Total", value: orders.length, icon: ShoppingCart, style: "bg-primary/10 text-primary" },
    { label: "Pagos", value: paidCount, icon: CheckCircle2, style: "bg-emerald-500/10 text-emerald-600" },
    { label: "Pendentes", value: pendingCount, icon: Clock, style: "bg-amber-500/10 text-amber-600" },
    { label: "Falhados", value: failedCount, icon: XCircle, style: "bg-red-500/10 text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Todas as encomendas dos seus produtos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <OrdersTable orders={orders} />
    </div>
  );
}
