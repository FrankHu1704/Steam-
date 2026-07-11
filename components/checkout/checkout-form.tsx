"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Download, Tag, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import { createOrder, getOrderStatus, validateCoupon, type CouponPreview } from "@/lib/actions/checkout";
import { getDownloadLinks } from "@/lib/actions/downloads";
import type { PaymentMethod } from "@/lib/debito-pay";
import type { Product } from "@/types/database";

const MOBILE_MONEY_METHODS: PaymentMethod[] = ["mpesa", "emola", "mkesh"];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  mkesh: "mKesh",
  visa_mastercard: "Cartão (Visa/Mastercard)",
  payfast: "PayFast",
};

function paymentMethodsForCurrency(currency: string): PaymentMethod[] {
  return currency === "ZAR" ? ["payfast", "visa_mastercard"] : ["mpesa", "emola", "mkesh", "visa_mastercard"];
}

interface CheckoutFormProps {
  product: Product;
  bumps: Product[];
  affiliateRef?: string;
}

type Step = "form" | "pending" | "paid" | "failed";

export function CheckoutForm({ product, bumps, affiliateRef }: CheckoutFormProps) {
  const currency = product.currency;
  const methods = paymentMethodsForCurrency(currency);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(methods[0]);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<{ name: string; url: string | null }[]>([]);

  const requiresPhone = MOBILE_MONEY_METHODS.includes(paymentMethod);

  const baseAmount = product.promo_price ?? product.price;
  const bumpTotal = bumps
    .filter((b) => selectedBumps.includes(b.id))
    .reduce((sum, b) => sum + (b.promo_price ?? b.price), 0);
  const discount = coupon?.discountAmount ?? 0;
  const total = Math.max(0, baseAmount - discount) + bumpTotal;

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponError(null);
    const result = await validateCoupon(product.id, couponCode.trim());
    setCheckingCoupon(false);
    if (result.error) {
      setCouponError(result.error);
      setCoupon(null);
      return;
    }
    setCoupon(result.coupon ?? null);
  }

  async function pollOrderStatus(id: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const result = await getOrderStatus(id);
      if (result.status === "paid") {
        setStep("paid");
        const dl = await getDownloadLinks(id);
        setFiles(dl.files ?? []);
        return;
      }
      if (result.status === "failed" || result.status === "expired") {
        setStep("failed");
        return;
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await createOrder({
      productSlug: product.slug,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone || undefined,
      paymentMethod,
      couponCode: coupon ? couponCode.trim() : undefined,
      bumpProductIds: selectedBumps,
      affiliateCode: affiliateRef,
      returnUrl: typeof window !== "undefined" ? window.location.href : undefined,
    });

    setPending(false);

    if (result.error || !result.orderId) {
      setError(result.error ?? "Falha ao criar o pedido.");
      return;
    }

    setOrderId(result.orderId);

    if (result.checkoutUrl) {
      setCheckoutUrl(result.checkoutUrl);
      setStep("pending");
      return;
    }

    if (result.status === "success") {
      setStep("paid");
      const dl = await getDownloadLinks(result.orderId);
      setFiles(dl.files ?? []);
      return;
    }

    setStep("pending");
    void pollOrderStatus(result.orderId);
  }

  if (step === "paid") {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-3 font-semibold">Pagamento confirmado!</p>
        <p className="text-sm text-muted-foreground">
          Enviámos os ficheiros para {email}. Também pode transferi-los abaixo.
        </p>
        <div className="mt-4 space-y-2 text-left">
          {files.map((f, i) => (
            <a
              key={i}
              href={f.url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary"
            >
              <Download className="h-4 w-4 text-primary" />
              {f.name}
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (step === "pending") {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card p-5 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 font-semibold">A aguardar confirmação do pagamento…</p>
        <p className="text-sm text-muted-foreground">
          {requiresPhone
            ? "Verifique o seu telemóvel e aprove a transação."
            : "Conclua o pagamento na página aberta e volte aqui."}
        </p>
        {checkoutUrl && (
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Abrir página de pagamento <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {orderId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void pollOrderStatus(orderId)}
          >
            Já paguei, verificar novamente
          </Button>
        )}
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center">
        <p className="font-semibold text-destructive">O pagamento não foi concluído.</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setStep("form")}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {bumps.length > 0 && (
        <div className="space-y-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase text-primary">Adicione também</p>
          {bumps.map((bump) => (
            <label
              key={bump.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-background/60 p-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary"
                  checked={selectedBumps.includes(bump.id)}
                  onChange={(e) =>
                    setSelectedBumps((prev) =>
                      e.target.checked ? [...prev, bump.id] : prev.filter((id) => id !== bump.id)
                    )
                  }
                />
                {bump.title}
              </span>
              <span className="font-medium">
                +{formatCurrency(bump.promo_price ?? bump.price, currency as "MZN" | "ZAR")}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="method">Método de pagamento</Label>
        <Select
          id="method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          {methods.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_LABELS[m]}
            </option>
          ))}
        </Select>
      </div>

      {requiresPhone && (
        <div className="space-y-1.5">
          <Label htmlFor="phone">Número de telemóvel</Label>
          <Input
            id="phone"
            required
            placeholder="84xxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="coupon">Cupão de desconto</Label>
        <div className="flex gap-2">
          <Input
            id="coupon"
            placeholder="Código"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value);
              setCoupon(null);
              setCouponError(null);
            }}
          />
          <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={checkingCoupon}>
            {checkingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
            Aplicar
          </Button>
        </div>
        {couponError && <p className="text-xs text-destructive">{couponError}</p>}
        {coupon && (
          <p className="text-xs font-medium text-emerald-600">
            Cupão &quot;{coupon.code}&quot; aplicado: -{formatCurrency(coupon.discountAmount, currency as "MZN" | "ZAR")}
          </p>
        )}
      </div>

      <div className="space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Produto</span>
          <span>{formatCurrency(baseAmount, currency as "MZN" | "ZAR")}</span>
        </div>
        {bumpTotal > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Extras</span>
            <span>+{formatCurrency(bumpTotal, currency as "MZN" | "ZAR")}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Desconto</span>
            <span>-{formatCurrency(discount, currency as "MZN" | "ZAR")}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(total, currency as "MZN" | "ZAR")}</span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Finalizar compra
      </Button>
    </form>
  );
}
