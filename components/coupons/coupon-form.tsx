"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createCoupon } from "@/lib/actions/coupons";
import type { CouponDiscountType, Product } from "@/types/database";

export function CouponForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [productId, setProductId] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createCoupon({
      code,
      discountType,
      discountValue: Number(discountValue),
      productId: productId || null,
      maxUses: maxUses ? Number(maxUses) : null,
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCode("");
    setDiscountValue("");
    setMaxUses("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="code">Código</Label>
        <Input id="code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PROMO10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="product">Produto (opcional)</Label>
        <Select id="product" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Todos os produtos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="discount-type">Tipo de desconto</Label>
        <Select id="discount-type" value={discountType} onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}>
          <option value="percent">Percentagem (%)</option>
          <option value="fixed">Valor fixo</option>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="discount-value">Valor do desconto</Label>
        <Input
          id="discount-value"
          type="number"
          min={0}
          step="0.01"
          required
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="max-uses">Limite de utilizações (opcional)</Label>
        <Input id="max-uses" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Criar cupão
        </Button>
      </div>
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
    </form>
  );
}
