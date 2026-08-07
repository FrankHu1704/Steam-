import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Signature verification and order reconciliation aren't wired up yet —
// Pagar's exact webhook payload shape and signature scheme aren't
// documented on our side. This endpoint just captures real test/live
// deliveries into `logs` so the actual shape can be inspected, and
// responds fast with a tiny body (a previous 404 from the missing route
// was rejected by Pagar's test sender for exceeding its response size
// limit).
export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body: unknown = rawBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // keep raw text if it isn't JSON
  }

  const supabase = createAdminClient();
  await supabase.from("logs").insert({
    action: "pagar_webhook_raw",
    target_table: "orders",
    target_id: null,
    metadata: { headers, body },
  });

  return NextResponse.json({ ok: true });
}
