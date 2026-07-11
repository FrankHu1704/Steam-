import { OrdersTable } from "@/components/orders/orders-table";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getProducerOrders } from "@/lib/data/orders";

export default async function DashboardOrdersPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) return null;

  const orders = await getProducerOrders(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Todas as encomendas dos seus produtos.</p>
      </div>
      <OrdersTable orders={orders} />
    </div>
  );
}
