"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ImageOff, PackageSearch, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { ProductCardActions } from "@/components/products/product-card-actions";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/database";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os estados" },
  { value: "draft", label: "Rascunho" },
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "paused", label: "Pausado" },
];

export function ProductsGrid({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (status && p.status !== status) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, search, status]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar produtos…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
            <PackageSearch className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          </div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-lg">
            <Link href={p.is_payment_link ? `/dashboard/products/link/${p.id}` : `/dashboard/products/${p.id}`}>
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
                {p.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_image_url} alt={p.title} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <p className="line-clamp-1 font-semibold">{p.title}</p>
                <StatusBadge status={p.status} />
              </div>
              {p.is_payment_link && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Link2 className="h-3 w-3" /> Link de pagamento
                </span>
              )}
              <p className="mt-1 font-medium">
                {formatCurrency(p.promo_price ?? p.price, p.currency as "MZN" | "ZAR")}
              </p>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>{p.view_count} visualizações</span>
                <span>{p.sales_count} vendas</span>
              </div>
            </Link>
            {(p.status === "approved" || p.status === "paused") && (
              <ProductCardActions slug={p.slug} title={p.title} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
