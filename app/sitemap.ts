import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pagaja.site";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/marketplace`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/taxas`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${siteUrl}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/conteudo`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const supabase = createAdminClient();
  const { data: products } = await supabase
    .from("products")
    .select("slug, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(2000);

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${siteUrl}/p/${p.slug}`,
    lastModified: p.created_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
