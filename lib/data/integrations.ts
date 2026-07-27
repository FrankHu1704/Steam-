import { createClient } from "@/lib/supabase/server";

export interface IntegrationsOverview {
  productsWithFacebookPixel: number;
  productsWithTiktokPixel: number;
  productsWithGoogleAnalytics: number;
  productsWithCustomScript: number;
  totalProducts: number;
}

export async function getIntegrationsOverview(producerId: string): Promise<IntegrationsOverview> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("facebook_pixel_id, tiktok_pixel_id, google_analytics_id, tracking_script")
    .eq("producer_id", producerId);

  const rows = data ?? [];
  return {
    productsWithFacebookPixel: rows.filter((r) => r.facebook_pixel_id).length,
    productsWithTiktokPixel: rows.filter((r) => r.tiktok_pixel_id).length,
    productsWithGoogleAnalytics: rows.filter((r) => r.google_analytics_id).length,
    productsWithCustomScript: rows.filter((r) => r.tracking_script).length,
    totalProducts: rows.length,
  };
}
