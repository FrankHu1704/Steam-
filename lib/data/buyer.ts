import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/types/database";

export interface BuyerOrder extends Order {
  product_title: string;
  product_slug: string;
  product_cover: string | null;
}

export async function getMyOrders(): Promise<BuyerOrder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, products(title, slug, cover_image_url)")
    .order("created_at", { ascending: false });

  return ((data ?? []) as (Order & { products: { title: string; slug: string; cover_image_url: string | null } | null })[]).map(
    (o) => ({
      ...o,
      product_title: o.products?.title ?? "Produto",
      product_slug: o.products?.slug ?? "",
      product_cover: o.products?.cover_image_url ?? null,
    })
  );
}

export interface BuyerDownload {
  orderId: string;
  productTitle: string;
  productSlug: string;
  fileName: string;
  storagePath: string | null;
}

export async function getMyPaidFiles(): Promise<BuyerDownload[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("downloads")
    .select("order_id, product_files(name, storage_path, products(title, slug)), orders!inner(status)")
    .eq("orders.status", "paid")
    .order("created_at", { ascending: false });

  type Row = {
    order_id: string;
    product_files: { name: string; storage_path: string | null; products: { title: string; slug: string } | null } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((row) => row.product_files)
    .map((row) => ({
      orderId: row.order_id,
      productTitle: row.product_files!.products?.title ?? "Produto",
      productSlug: row.product_files!.products?.slug ?? "",
      fileName: row.product_files!.name,
      storagePath: row.product_files!.storage_path,
    }));
}
