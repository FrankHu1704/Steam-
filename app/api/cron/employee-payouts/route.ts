import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActivePaymentProvider, providerModule } from "@/lib/payments";
import { creditMonthlyCtoShare } from "@/lib/cto";

// Runs on day 1 of every month (see vercel.json) — pays out every active
// employee's accrued recruiter commission automatically via B2C. Only
// M-Pesa payouts can be automated (same provider limitation as producer
// withdrawals); e-Mola employees get a "failed" record so an admin can pay
// them manually and the balance stays untouched for a retry.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const periodMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);

  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, mpesa_number, balance_available")
    .eq("active", true)
    .gt("balance_available", 0);

  const results: { employeeId: string; status: string; amount: number }[] = [];

  for (const employee of employees ?? []) {
    const { data: existing } = await supabase
      .from("employee_payouts")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("period_month", periodMonth)
      .maybeSingle();
    if (existing) {
      results.push({ employeeId: employee.id, status: "already_processed", amount: employee.balance_available });
      continue;
    }

    const amount = employee.balance_available;

    if (!employee.mpesa_number) {
      await supabase.from("employee_payouts").insert({
        employee_id: employee.id,
        amount,
        status: "failed",
        failure_reason: "Sem número M-Pesa registado — o B2C automático não suporta e-Mola. Pague manualmente.",
        period_month: periodMonth,
      });
      results.push({ employeeId: employee.id, status: "failed", amount });
      continue;
    }

    try {
      const providerName = await getActivePaymentProvider();
      const result = await providerModule(providerName).createPayout({
        method: "mpesa",
        amount,
        destination: employee.mpesa_number,
        notes: `Comissão PagaJá — colaborador ${employee.name}`,
        autoDispatch: true,
      });

      if (!result.success || result.status !== "success") {
        await supabase.from("employee_payouts").insert({
          employee_id: employee.id,
          amount,
          status: "failed",
          failure_reason: result.error ?? "Pagamento não confirmado pelo processador.",
          period_month: periodMonth,
        });
        results.push({ employeeId: employee.id, status: "failed", amount });
        continue;
      }

      await supabase.from("employee_payouts").insert({
        employee_id: employee.id,
        amount,
        status: "paid",
        payout_reference: result.providerReference ?? result.reference ?? null,
        period_month: periodMonth,
        paid_at: new Date().toISOString(),
      });
      await supabase
        .from("employees")
        .update({ balance_available: employee.balance_available - amount })
        .eq("id", employee.id);
      results.push({ employeeId: employee.id, status: "paid", amount });
    } catch (err) {
      await supabase.from("employee_payouts").insert({
        employee_id: employee.id,
        amount,
        status: "failed",
        failure_reason: (err as Error).message,
        period_month: periodMonth,
      });
      results.push({ employeeId: employee.id, status: "failed", amount });
    }
  }

  await supabase.from("logs").insert({
    action: "employee_payouts_cron",
    metadata: { periodMonth, results },
  });

  // Same day-1-of-month slot also credits 25% of last month's platform
  // net profit to every CTO's withdrawable balance — see lib/cto.ts.
  const ctoResult = await creditMonthlyCtoShare(periodMonth);
  await supabase.from("logs").insert({
    action: "cto_payout_credit_cron",
    metadata: { periodMonth, ...ctoResult },
  });

  return NextResponse.json({ ok: true, periodMonth, results, cto: ctoResult });
}
