"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/auth";
import type { ShippingStatus } from "@/types/database";

// Orders have no client-side RLS update policy (writes only happen via
// service-role server actions/webhook), so this verifies producer
// ownership itself before writing through the admin client.
export async function updateShippingStatus(
  orderId: string,
  status: ShippingStatus,
  trackingReference?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("producer_id, status").eq("id", orderId).single();
  if (!order || order.producer_id !== user.id) return { error: "Pedido não encontrado." };
  if (order.status !== "paid") return { error: "Este pedido ainda não foi pago." };

  const { error } = await admin
    .from("orders")
    .update({ shipping_status: status, tracking_reference: trackingReference || null })
    .eq("id", orderId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/orders");
  return {};
}
