import { Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CouponForm } from "@/components/coupons/coupon-form";
import { CouponRowActions } from "@/components/coupons/coupon-row-actions";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyCoupons } from "@/lib/data/coupons";
import { getMyProducts } from "@/lib/data/products";
import { formatCurrency } from "@/lib/utils";

export default async function CouponsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return null;

  const [coupons, products] = await Promise.all([getMyCoupons(user.id), getMyProducts(user.id)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cupões de Desconto</h1>
        <p className="text-sm text-muted-foreground">Crie códigos promocionais para os seus produtos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo cupão</CardTitle>
        </CardHeader>
        <CardContent>
          <CouponForm products={products} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {coupons.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Ticket className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Ainda não criou nenhum cupão.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Código</th>
                    <th className="p-4 font-medium">Produto</th>
                    <th className="p-4 font-medium">Desconto</th>
                    <th className="p-4 font-medium">Utilizações</th>
                    <th className="p-4 font-medium">Ativo</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-mono font-semibold">{coupon.code}</td>
                      <td className="p-4 text-muted-foreground">{coupon.product_title ?? "Todos os produtos"}</td>
                      <td className="p-4">
                        {coupon.discount_type === "percent"
                          ? `${coupon.discount_value}%`
                          : formatCurrency(coupon.discount_value, "MZN")}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {coupon.used_count}
                        {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                      </td>
                      <td className="p-4">
                        <CouponRowActions couponId={coupon.id} active={coupon.active} />
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
