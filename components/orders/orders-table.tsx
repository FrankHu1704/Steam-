"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ShippingStatusControl } from "@/components/orders/shipping-status-control";
import { formatCurrency } from "@/lib/utils";
import type { ProducerOrder } from "@/lib/data/orders";

function toCsv(rows: ProducerOrder[]): string {
  const header = ["Produto", "Cliente", "Email", "Valor", "Moeda", "Método", "Estado", "Data"];
  const lines = rows.map((o) =>
    [
      o.product_title,
      o.buyer_name,
      o.buyer_email,
      o.total_amount,
      o.currency,
      o.payment_method ?? "",
      o.status,
      new Date(o.created_at).toISOString(),
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function OrdersTable({ orders }: { orders: ProducerOrder[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(
      (o) =>
        o.buyer_name.toLowerCase().includes(term) ||
        o.buyer_email.toLowerCase().includes(term) ||
        o.product_title.toLowerCase().includes(term)
    );
  }, [orders, search]);

  function handleExport() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por cliente, email ou produto…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-4 font-medium">Produto</th>
              <th className="p-4 font-medium">Cliente</th>
              <th className="p-4 font-medium">Valor</th>
              <th className="p-4 font-medium">Método</th>
              <th className="p-4 font-medium">Estado</th>
              <th className="p-4 font-medium">Envio</th>
              <th className="p-4 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id} className="border-b border-border/60 last:border-0">
                  <td className="p-4 font-medium">{order.product_title}</td>
                  <td className="p-4 text-muted-foreground">
                    {order.buyer_name}
                    <div className="text-xs">{order.buyer_email}</div>
                  </td>
                  <td className="p-4">{formatCurrency(order.total_amount, order.currency as "MZN" | "ZAR")}</td>
                  <td className="p-4 capitalize text-muted-foreground">
                    {order.payment_method?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="p-4">
                    {order.product_type === "physical" && order.status === "paid" ? (
                      <ShippingStatusControl
                        orderId={order.id}
                        status={order.shipping_status}
                        trackingReference={order.tracking_reference}
                        address={
                          [order.shipping_address, order.shipping_city, order.shipping_province]
                            .filter(Boolean)
                            .join(", ") || null
                        }
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground">{new Date(order.created_at).toLocaleDateString("pt-MZ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
