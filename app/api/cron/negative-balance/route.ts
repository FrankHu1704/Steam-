import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNegativeBalance } from "@/lib/debt-fulfillment";

// Daily reminder for every account currently in debt (balance_available <
// 0) — runs every day, deliberately with no throttle table: unlike
// producer-nudges (which spaces its reminders out over days), the point
// here is a fresh notice every single day the debt stays open.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: debtors } = await supabase.from("profiles").select("id").lt("balance_available", 0);

  for (const debtor of debtors ?? []) {
    await notifyNegativeBalance({ producerId: debtor.id, walletField: "balance_available" });
  }

  return NextResponse.json({ ok: true, notified: debtors?.length ?? 0 });
}
