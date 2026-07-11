import Link from "next/link";
import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMyOrders } from "@/lib/data/buyer";

export default async function MyProductsPage() {
  const orders = await getMyOrders();
  const paid = orders.filter((o) => o.status === "paid");

  const byProduct = new Map<string, (typeof paid)[number]>();
  for (const order of paid) {
    if (!byProduct.has(order.product_id)) byProduct.set(order.product_id, order);
  }
  const products = Array.from(byProduct.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Produtos</h1>
        <p className="text-sm text-muted-foreground">Produtos que já comprou e pode aceder a qualquer momento.</p>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Ainda não comprou nenhum produto.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/">Explorar produtos</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((order) => (
            <Card key={order.product_id} className="overflow-hidden">
              {order.product_cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.product_cover} alt={order.product_title} className="aspect-video w-full object-cover" />
              )}
              <CardContent className="p-4">
                <p className="font-semibold">{order.product_title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Comprado em {new Date(order.created_at).toLocaleDateString("pt-MZ")}
                </p>
                <Button asChild size="sm" className="mt-3 w-full">
                  <Link href="/account/downloads">Ver downloads</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
