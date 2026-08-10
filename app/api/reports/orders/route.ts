import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const { data: orders } = await supabase
    .from("orders")
    .select("*, products(title)")
    .eq("producer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = (orders ?? []) as (Record<string, unknown> & { products: { title: string } | null })[];

  const header = ["Data", "Produto", "Comprador", "Email", "Valor", "Moeda", "Método", "Estado"];
  const lines = [header.join(",")];
  for (const o of rows) {
    lines.push(
      [
        o.created_at,
        o.products?.title ?? o.description ?? "—",
        o.buyer_name,
        o.buyer_email,
        o.total_amount,
        o.currency,
        o.payment_method,
        o.status,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pagaja-vendas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
