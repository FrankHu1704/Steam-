import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveB2CProvider, chargeProviderModule } from "@/lib/payments";
import { creditMonthlyCtoShare } from "@/lib/cto";

// Runs on day 1 of every month (see vercel.json) — pays out every active
// employee's accrued recruiter commission automatically via B2C. M-Pesa is
// preferred (auto-dispatchable on every processor); e-Mola-only employees
// route through Pagar specifically, which absorbs its own payout fee into
// PayNow's margin (see PAGAR_PAYOUT_FEE_RATE in lib/pagar.ts) so the
// employee still gets their full accrued balance. An employee with neither
// number set gets a "failed" record so an admin can pay them manually.
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
    .select("id, name, mpesa_number, emola_number, balance_available")
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
    const method: "mpesa" | "emola" | null = employee.mpesa_number ? "mpesa" : employee.emola_number ? "emola" : null;
    const destination = method === "mpesa" ? employee.mpesa_number : method === "emola" ? employee.emola_number : null;

    if (!method || !destination) {
      await supabase.from("employee_payouts").insert({
        employee_id: employee.id,
        amount,
        status: "failed",
        failure_reason: "Sem número M-Pesa nem e-Mola registado — pague manualmente.",
        period_month: periodMonth,
      });
      results.push({ employeeId: employee.id, status: "failed", amount });
      continue;
    }

    try {
      const providerName = await resolveB2CProvider(method, "MZN");
      const result = await chargeProviderModule(providerName).createPayout({
        method,
        amount,
        destination,
        notes: `Comissão PayNow — colaborador ${employee.name}`,
        recipientName: employee.name,
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

      const providerFeeAmount = providerName === "pagar" && typeof result.feeAmount === "number" ? result.feeAmount : 0;

      await supabase.from("employee_payouts").insert({
        employee_id: employee.id,
        amount,
        status: "paid",
        payout_reference: result.providerReference ?? result.reference ?? null,
        period_month: periodMonth,
        paid_at: new Date().toISOString(),
        provider_fee_amount: providerFeeAmount,
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
