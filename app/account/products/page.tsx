import Link from "next/link";
import { Package, GraduationCap, ImageOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeaveReviewButton } from "@/components/reviews/leave-review-button";
import { getMyOrders } from "@/lib/data/buyer";
import { productHasCourseContent } from "@/lib/data/courses";
import { getReviewedOrderIds } from "@/lib/data/reviews";
import { getCurrentUserAndProfile } from "@/lib/data/profile";

export default async function MyProductsPage() {
  const { user } = await getCurrentUserAndProfile();
  const orders = await getMyOrders();
  // Manual API charges (no product_id) have nothing to show here.
  const paid = orders.filter((o) => o.status === "paid" && o.product_id);

  const byProduct = new Map<string, (typeof paid)[number]>();
  for (const order of paid) {
    if (!byProduct.has(order.product_id!)) byProduct.set(order.product_id!, order);
  }
  const products = Array.from(byProduct.values());
  const [courseFlags, reviewedOrderIds] = await Promise.all([
    Promise.all(products.map((p) => productHasCourseContent(p.product_id!))),
    user ? getReviewedOrderIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

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
          {products.map((order, i) => (
            <Card key={order.product_id} className="overflow-hidden">
              {order.product_cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.product_cover} alt={order.product_title} className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-muted">
                  <ImageOff className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <CardContent className="p-4">
                <p className="font-semibold">{order.product_title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Comprado em {new Date(order.created_at).toLocaleDateString("pt-MZ")}
                </p>
                <div className="mt-3 space-y-2">
                  {courseFlags[i] && (
                    <Button asChild size="sm" className="w-full gap-1.5">
                      <Link href={`/account/courses/${order.product_id}`}>
                        <GraduationCap className="h-4 w-4" /> Acessar Curso
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant={courseFlags[i] ? "outline" : "default"} className="w-full">
                    <Link href="/account/downloads">Ver downloads</Link>
                  </Button>
                  {!reviewedOrderIds.has(order.id) && <LeaveReviewButton orderId={order.id} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
