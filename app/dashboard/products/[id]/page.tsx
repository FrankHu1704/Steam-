import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getCategories, getProductForOwner, getBumpCandidates, getBumpOfferIds, getUpsellOffer } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";
import { hasFacebookCapiToken } from "@/lib/actions/facebook-capi";
import { ProductForm } from "@/components/products/product-form";
import { ProductActions } from "@/components/products/product-actions";
import { ShareLinkCard } from "@/components/products/share-link-card";
import { AiAnalysisCard } from "@/components/products/ai-analysis-card";
import { CourseBuilder } from "@/components/courses/course-builder";
import { CheckoutBlocksEditor } from "@/components/products/checkout-blocks-editor";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { getProducerCourseStructure } from "@/lib/data/courses";
import type { ProductFile } from "@/types/database";

const COURSE_CATEGORY_SLUGS = ["cursos", "mentorias"];

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  const product = await getProductForOwner(id, user.id);
  if (!product) redirect("/dashboard/products");
  if (product.is_payment_link) redirect(`/dashboard/products/link/${id}`);

  const categories = await getCategories();
  const supabase = await createClient();
  const [{ data: files }, bumpCandidates, bumpOfferIds, upsellOffer, hasCapiToken] = await Promise.all([
    supabase.from("product_files").select("*").eq("product_id", id).order("sort_order"),
    getBumpCandidates(user.id, id),
    getBumpOfferIds(id),
    getUpsellOffer(id),
    hasFacebookCapiToken(id),
  ]);

  const category = categories.find((c) => c.id === product.category_id);
  const isCourseProduct = category ? COURSE_CATEGORY_SLUGS.includes(category.slug) : false;
  const courseModules = isCourseProduct ? await getProducerCourseStructure(id) : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <StatusBadge status={product.status} />
          </div>
          {product.rejection_reason && (
            <p className="mt-1 text-sm text-destructive">Motivo: {product.rejection_reason}</p>
          )}
        </div>
        <ProductActions product={product} />
      </div>

      {(product.status === "approved" || product.status === "paused") && (
        <div className="mt-6">
          <ShareLinkCard productTitle={product.title} slug={product.slug} />
        </div>
      )}

      {isCourseProduct && (
        <div className="mt-6">
          <CourseBuilder productId={id} modules={courseModules} />
        </div>
      )}

      <div className="mt-6">
        <AiAnalysisCard
          productId={id}
          initialAnalysis={product.ai_analysis}
          initialAnalysisAt={product.ai_analysis_at}
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

      <div className="mt-8">
        <ProductForm
          userId={user.id}
          categories={categories}
          product={product}
          existingFiles={(files as ProductFile[]) ?? []}
          bumpCandidates={bumpCandidates}
          bumpOfferIds={bumpOfferIds}
          upsellOffer={upsellOffer}
          hasCapiToken={hasCapiToken}
        />
      </div>
    </div>
  );
}
