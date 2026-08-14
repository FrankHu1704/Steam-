import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getProductForOwner } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";
import { PaymentLinkForm } from "@/components/products/payment-link-form";
import { ShareLinkCard } from "@/components/products/share-link-card";
import { CheckoutBlocksEditor } from "@/components/products/checkout-blocks-editor";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import type { ProductFile } from "@/types/database";

export default async function EditPaymentLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  const product = await getProductForOwner(id, user.id);
  if (!product) redirect("/dashboard/products");
  if (!product.is_payment_link) redirect(`/dashboard/products/${id}`);

  const supabase = await createClient();
  const { data: files } = await supabase.from("product_files").select("*").eq("product_id", id).order("sort_order").limit(1);

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Editar Link de Pagamento</h1>
        <StatusBadge status={product.status} />
      </div>
      {product.rejection_reason && <p className="mt-1 text-sm text-destructive">Motivo: {product.rejection_reason}</p>}
      {product.status === "approved" && (
        <div className="mt-6 max-w-lg">
          <ShareLinkCard productTitle={product.title} slug={product.slug} />
        </div>
      )}
      <div className="mt-6">
        <PaymentLinkForm
          userId={user.id}
          currency={profile.currency as "MZN" | "ZAR"}
          product={product}
          existingFile={(files as ProductFile[])?.[0] ?? null}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-semibold">Personalizar página de checkout</h2>
        <Card>
          <CardContent className="p-6">
            <CheckoutBlocksEditor productId={id} initialBlocks={product.checkout_blocks} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
