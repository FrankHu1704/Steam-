import { createAdminClient } from "@/lib/supabase/admin";
import { sendSaleNotificationEmail } from "@/lib/email";
import { sendSaleSms } from "@/lib/sms";

// Shared by the Debito Pay webhook and the admin "mark as paid" fallback —
// whichever one gets there first does the crediting; the `credited_at`
// guard makes this safe to call more than once for the same order.
export async function creditOrder(orderId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.credited_at) return;

  const { data: platformFeeSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "platform_fee_percent")
    .single();
  const platformFeePercent = Number(platformFeeSetting?.value ?? 0);

  const commission = order.affiliate_commission_amount ?? 0;
  const ownerNet = (order.total_amount - commission) * (1 - platformFeePercent / 100);

  const { data: producer } = await supabase
    .from("profiles")
    .select("balance_available, email, phone")
    .eq("id", order.producer_id)
    .single();
  await supabase
    .from("profiles")
    .update({ balance_available: (producer?.balance_available ?? 0) + ownerNet })
    .eq("id", order.producer_id);

  const { data: product } = await supabase
    .from("products")
    .select("title, product_type, stock_quantity")
    .eq("id", order.product_id)
    .single();

  await supabase.rpc("increment_product_sales", { p_id: order.product_id });

  if (product?.product_type === "physical") {
    if (product.stock_quantity != null) {
      await supabase
        .from("products")
        .update({ stock_quantity: Math.max(0, product.stock_quantity - 1) })
        .eq("id", order.product_id);
    }
    await supabase.from("orders").update({ shipping_status: "pending" }).eq("id", order.id);
  }

  if (order.affiliate_id && commission > 0) {
    const { data: affiliate } = await supabase.from("affiliates").select("*").eq("id", order.affiliate_id).single();
    if (affiliate) {
      const { data: affiliateProfile } = await supabase
        .from("profiles")
        .select("balance_available")
        .eq("id", affiliate.affiliate_id)
        .single();
      await supabase
        .from("profiles")
        .update({ balance_available: (affiliateProfile?.balance_available ?? 0) + commission })
        .eq("id", affiliate.affiliate_id);
      await supabase
        .from("affiliates")
        .update({ sales: affiliate.sales + 1, commission_earned: affiliate.commission_earned + commission })
        .eq("id", affiliate.id);
      await supabase.from("commissions").insert({
        affiliate_row_id: affiliate.id,
        order_id: order.id,
        amount: commission,
        status: "pending",
      });
    }
  }

  // Grant downloads for every file on the purchased product (and any
  // order-bump products), each with its own signed-access token.
  const { data: bumpRows } = await supabase.from("order_bumps").select("bump_product_id").eq("order_id", order.id);
  const productIds = [order.product_id, ...(bumpRows ?? []).map((b) => b.bump_product_id)];
  const { data: files } = await supabase.from("product_files").select("*").in("product_id", productIds);
  if (files?.length) {
    await supabase.from("downloads").insert(files.map((f) => ({ order_id: order.id, product_file_id: f.id })));
  }

  await supabase.from("notifications").insert({
    user_id: order.producer_id,
    type: "sale",
    title: "Nova venda!",
    message: `Você vendeu por ${order.total_amount} ${order.currency}.`,
  });

  if (producer?.email) {
    await sendSaleNotificationEmail({
      producerEmail: producer.email,
      productTitle: product?.title ?? "o seu produto",
      amount: order.total_amount,
      currency: order.currency,
    });
  }

  if (producer?.phone) {
    await sendSaleSms({
      phone: producer.phone,
      productTitle: product?.title ?? "o seu produto",
      amount: order.total_amount,
      currency: order.currency,
    });
  }

  await supabase.from("orders").update({ credited_at: new Date().toISOString() }).eq("id", order.id);
}
