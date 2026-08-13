import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInactiveProducerDeletionEnabled } from "@/lib/data/admin";
import { sendAccountDeletedInactivityEmail } from "@/lib/email";

// Enforces two onboarding deadlines for producer accounts, run daily (see
// vercel.json):
//   - No product created within 3 days of becoming a producer → deleted.
//   - Zero lifetime sales 14 days after becoming a producer → deleted.
// Once lifetime_sales_count > 0, an account is permanently exempt from
// the second rule even after a later dry spell — see the migration
// comment (0054_producer_inactivity_deletion.sql) for why
// became_producer_at (not the original signup date) is the clock these
// run from. is_cto producers are exempt outright (admin-appointed, not a
// dormant test account). Deletion is a real supabase.auth.admin.deleteUser
// call — cascades through profiles → products → orders per the schema, so
// this only ever runs against accounts confirmed to have zero sales.
const PRODUCT_GRACE_MS = 3 * 24 * 60 * 60 * 1000;
const SALE_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!(await isInactiveProducerDeletionEnabled())) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  const supabase = createAdminClient();
  const now = Date.now();

  const { data: producers } = await supabase
    .from("profiles")
    .select("id, name, email, became_producer_at, lifetime_sales_count")
    .eq("role", "producer")
    .eq("is_cto", false)
    .not("became_producer_at", "is", null);

  const results: { id: string; reason: string }[] = [];

  for (const producer of producers ?? []) {
    const becameProducerAt = new Date(producer.became_producer_at as string).getTime();
    let reason: string | null = null;

    if (now - becameProducerAt > PRODUCT_GRACE_MS) {
      const { count: productCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("producer_id", producer.id);
      if (!productCount) {
        reason = "Nenhum produto cadastrado 3 dias depois de se tornar produtor.";
      }
    }

    if (!reason && producer.lifetime_sales_count === 0 && now - becameProducerAt > SALE_GRACE_MS) {
      reason = "Nenhuma venda 2 semanas depois de se tornar produtor.";
    }

    if (!reason) continue;

    await supabase.from("logs").insert({
      action: "inactive_producer_deleted",
      target_table: "profiles",
      target_id: producer.id,
      metadata: { name: producer.name, email: producer.email, reason },
    });

    if (producer.email) {
      await sendAccountDeletedInactivityEmail({ to: producer.email, name: producer.name, reason });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(producer.id);
    if (!deleteError) {
      results.push({ id: producer.id, reason });
    } else {
      await supabase.from("logs").insert({
        action: "inactive_producer_delete_error",
        target_table: "profiles",
        target_id: producer.id,
        metadata: { error: deleteError.message },
      });
    }
  }

  return NextResponse.json({ ok: true, deleted: results.length, results });
}
