"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function getDownloadLinks(orderId: string) {
  const supabase = createAdminClient();

  const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).single();
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status !== "paid") return { error: "Pagamento ainda não confirmado." };

  const { data: downloads } = await supabase
    .from("downloads")
    .select("*, product_files(*)")
    .eq("order_id", orderId);

  if (!downloads?.length) return { files: [] };

  const files = await Promise.all(
    downloads.map(async (d) => {
      const file = d.product_files as unknown as { name: string; storage_path: string | null; external_url: string | null };
      if (file.external_url) return { name: file.name, url: file.external_url };
      if (!file.storage_path) return { name: file.name, url: null };
      const { data } = await supabase.storage
        .from("product-files")
        .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS);
      return { name: file.name, url: data?.signedUrl ?? null };
    })
  );

  return { files: files.filter((f) => f.url) };
}
