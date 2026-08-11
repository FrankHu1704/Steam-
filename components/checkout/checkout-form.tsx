"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  CheckCircle2,
  Download,
  Tag,
  ExternalLink,
  Landmark,
  User,
  Mail,
  Lock,
  ShieldCheck,
  Zap,
  ReceiptText,
  XCircle,
  ImageOff,
  Copy,
  Check,
  Users2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrder,
  getOrderStatus,
  validateCoupon,
  getUpsellOfferForOrder,
  acceptUpsellOffer,
  type CouponPreview,
  type UpsellOfferPreview,
} from "@/lib/actions/checkout";
import { getDownloadLinks } from "@/lib/actions/downloads";
import { resolveAccentColor } from "@/lib/checkout-theme";
import type { PaymentMethod } from "@/lib/debito-pay";
import type { Product } from "@/types/database";

export function UpsellOfferCard({ orderId }: { orderId: string }) {
  const [offer, setOffer] = useState<UpsellOfferPreview | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "accepting" | "pending" | "paid" | "failed" | "declined">(
    "loading"
  );
  const [upsellOrderId, setUpsellOrderId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await getUpsellOfferForOrder(orderId);
      setOffer(result);
      setStatus(result ? "idle" : "declined");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function pollUpsell(id: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const result = await getOrderStatus(id);
      if (result.status === "paid") {
        setStatus("paid");
        return;
      }
      if (result.status === "failed" || result.status === "expired") {
        setStatus("failed");
        return;
      }
    }
  }

  async function handleAccept() {
    if (!offer) return;
    setStatus("accepting");
    const result = await acceptUpsellOffer(orderId, offer.productId);
    if ("error" in result || !result.orderId) {
      setStatus("failed");
      return;
    }
    setUpsellOrderId(result.orderId);
    if (result.status === "success") {
      setStatus("paid");
      return;
    }
    setStatus("pending");
    void pollUpsell(result.orderId);
  }

  if (status === "loading" || status === "declined" || !offer) return null;

  if (status === "paid") {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm dark:border-emerald-900 dark:bg-emerald-950">
        <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
        <p className="mt-2 font-semibold">Oferta adicionada com sucesso!</p>
        <p className="text-muted-foreground">Enviámos o acesso de {offer.title} para o seu email.</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm">
        <p className="text-destructive">Não foi possível confirmar o pagamento da oferta.</p>
        {upsellOrderId && <p className="mt-1 text-xs text-muted-foreground">Pode tentar comprá-lo normalmente mais tarde.</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-primary">
        <Zap className="h-3.5 w-3.5" /> Oferta especial só agora
      </p>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {offer.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={offer.coverImageUrl} alt={offer.title} className="h-full w-full object-cover" />
          ) : (
            <ImageOff className="h-5 w-5 text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{offer.title}</p>
          <p className="text-sm font-bold text-primary">
            {formatCurrency(offer.price, offer.currency as "MZN" | "ZAR")}
          </p>
        </div>
      </div>
      {status === "pending" ? (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> A confirmar pagamento…
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            onClick={handleAccept}
            disabled={status === "accepting"}
          >
            {status === "accepting" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Sim, quero também!
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setStatus("declined")}>
            Não, obrigado
          </Button>
        </div>
      )}
    </div>
  );
}

const MOBILE_MONEY_METHODS: PaymentMethod[] = ["mpesa", "emola", "mkesh"];
// Matches pollOrderStatus below (20 attempts x 3s) — the countdown shown to
// the buyer reflects the real window the system keeps checking, not a fake
// timer.
const POLL_WINDOW_SECONDS = 60;

function shortReference(id: string): string {
  return `PGJ-${id.slice(0, 8).toUpperCase()}`;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  mkesh: "mKesh",
  visa_mastercard: "Cartão",
  payfast: "PayFast",
};

const PAYMENT_LOGOS: Partial<Record<PaymentMethod, string>> = {
  mpesa: "/payment-logos/mpesa.png",
  emola: "/payment-logos/emola.png",
  visa_mastercard: "/payment-logos/visa-mastercard.png",
};

const PAYMENT_STYLES: Record<PaymentMethod, string> = {
  mpesa: "bg-red-600",
  emola: "bg-orange-500",
  mkesh: "bg-amber-500",
  visa_mastercard: "bg-slate-800",
  payfast: "bg-teal-600",
};

function PaymentIcon({ method }: { method: PaymentMethod }) {
  const logo = PAYMENT_LOGOS[method];
  if (logo) {
    return (
      <span className="flex h-9 w-full items-center justify-center">
        <Image src={logo} alt={PAYMENT_LABELS[method]} width={72} height={36} className="h-8 w-auto object-contain" />
      </span>
    );
  }
  return (
    <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-white", PAYMENT_STYLES[method])}>
      <Landmark className="h-4 w-4" />
    </span>
  );
}

interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

interface CheckoutFormProps {
  product: Product;
  bumps: Product[];
  affiliateRef?: string;
  paymentMethods: PaymentMethod[];
  utm?: UtmParams;
}

type Step = "form" | "pending" | "paid" | "failed";

export function CheckoutForm({ product, bumps, affiliateRef, paymentMethods, utm }: CheckoutFormProps) {
  const currency = product.currency;
  const methods = paymentMethods;
  // Producer-chosen customization only applies to payment links (see
  // /dashboard/products/link) — accentColor always resolves from the fixed
  // palette in lib/checkout-theme.ts, never raw input.
  const accentColor = product.is_payment_link ? resolveAccentColor(product.checkout_accent_color) : null;
  const highlightText = product.is_payment_link ? product.checkout_highlight_text : null;

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
  const [secondsLeft, setSecondsLeft] = useState(POLL_WINDOW_SECONDS);
  const [copied, setCopied] = useState(false);
  const cancelledRef = useRef(false);

  const requiresPhone = MOBILE_MONEY_METHODS.includes(paymentMethod);

  useEffect(() => {
    if (step !== "pending") return;
    setSecondsLeft(POLL_WINDOW_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, orderId]);

  function handleCopyReference() {
    if (!orderId) return;
    void navigator.clipboard.writeText(shortReference(orderId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function readCookie(name: string): string | undefined {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  // Fires the SAME Purchase event client-side, with the SAME eventID
  // (order.id) as the server-side Conversions API call in
  // lib/order-fulfillment.ts — Facebook dedupes any pair sharing an
  // eventID, so this just gives it a second, faster signal instead of a
  // duplicate. A no-op if the product has no Facebook Pixel configured
  // (fbq never gets defined in that case — see lib/pixels.ts).
  function fireClientPurchaseEvent(id: string) {
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (!fbq) return;
    fbq("track", "Purchase", { value: total, currency }, { eventID: id });
  }

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
      if (cancelledRef.current) return;
      const result = await getOrderStatus(id);
      if (cancelledRef.current) return;
      if (result.status === "paid") {
        setStep("paid");
        fireClientPurchaseEvent(id);
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

  function handleCancelPayment() {
    cancelledRef.current = true;
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    cancelledRef.current = false;

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
      utmSource: utm?.source,
      utmMedium: utm?.medium,
      utmCampaign: utm?.campaign,
      utmContent: utm?.content,
      utmTerm: utm?.term,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc"),
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
      fireClientPurchaseEvent(result.orderId);
      const dl = await getDownloadLinks(result.orderId);
      setFiles(dl.files ?? []);
      return;
    }

    setStep("pending");
    void pollOrderStatus(result.orderId);
  }

  if (step === "paid") {
    return (
      <div className="mt-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950">
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
        {orderId && <UpsellOfferCard orderId={orderId} />}
      </div>
    );
  }

  if (step === "pending") {
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const seconds = String(secondsLeft % 60).padStart(2, "0");

    return (
      <div className="mt-6 rounded-xl border border-border bg-card p-5 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 font-semibold">A aguardar confirmação do pagamento…</p>
        <p className="text-sm text-muted-foreground">
          {requiresPhone
            ? "Verifique o seu telemóvel e aprove a transação."
            : checkoutUrl
              ? "Complete o pagamento seguro abaixo."
              : "Conclua o pagamento na página aberta e volte aqui."}
        </p>

        {!checkoutUrl && (
          <p className="mt-3 font-mono text-2xl font-bold text-primary">
            {minutes}:{seconds}
          </p>
        )}

        {checkoutUrl && (
          <div className="mt-4 space-y-2 text-left">
            <div className="overflow-hidden rounded-xl border border-border bg-white">
              <iframe
                src={checkoutUrl}
                title="Pagamento seguro"
                className="h-[560px] w-full"
                allow="payment"
              />
            </div>
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              A página não carrega? Abrir numa nova aba <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {orderId && (
          <button
            type="button"
            onClick={handleCopyReference}
            className="mx-auto mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40"
          >
            Código de suporte: <span className="font-mono font-semibold text-foreground">{shortReference(orderId)}</span>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {orderId && (
            <Button type="button" variant="outline" size="sm" onClick={() => void pollOrderStatus(orderId)}>
              Já paguei, verificar novamente
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={handleCancelPayment}>
            Cancelar pagamento
          </Button>
        </div>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center">
        <XCircle className="mx-auto h-10 w-10 text-destructive" />
        <p className="mt-3 font-semibold text-destructive">O pagamento não foi concluído.</p>
        <p className="text-sm text-muted-foreground">
          Isto pode acontecer por saldo insuficiente ou cancelamento no telemóvel. Pode tentar de novo.
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setStep("form")}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      {product.sales_count > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
          <Users2 className="h-4 w-4 shrink-0" />
          +{product.sales_count} pessoa{product.sales_count === 1 ? "" : "s"} já compr{product.sales_count === 1 ? "ou" : "aram"} este produto
        </div>
      )}
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
        <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center pl-3 text-muted-foreground">
            <User className="h-4 w-4" />
          </span>
          <Input
            id="name"
            required
            placeholder="O seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-0 focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <span className="flex items-center pl-3 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </span>
          <Input
            id="email"
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-0 focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Método de pagamento</Label>
        <div className={cn("grid gap-2", methods.length === 4 ? "grid-cols-2" : "grid-cols-3")}>
          {methods.map((m) => {
            const selected = paymentMethod === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 bg-card p-3 transition-all",
                  selected ? "border-primary shadow-md shadow-primary/10" : "border-border hover:border-primary/40 hover:shadow-sm"
                )}
              >
                {selected && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                )}
                <PaymentIcon method={m} />
                <span className="text-xs font-medium text-foreground">{PAYMENT_LABELS[m]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {requiresPhone && (
        <div className="space-y-1.5">
          <Label htmlFor="phone">Número {PAYMENT_LABELS[paymentMethod]}</Label>
          <div className="flex overflow-hidden rounded-lg border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="flex items-center bg-muted px-3 text-sm font-medium text-muted-foreground">+258</span>
            <Input
              id="phone"
              required
              placeholder="84xxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-none border-0 focus:ring-0"
            />
          </div>
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

      <div className="space-y-2 rounded-xl border border-border bg-muted p-4 text-sm">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <ReceiptText className="h-3.5 w-3.5" /> Resumo do pedido
        </p>
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
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
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
          <span>Total a pagar</span>
          <span className="text-primary">{formatCurrency(total, currency as "MZN" | "ZAR")}</span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {highlightText && (
        <p
          className="text-center text-sm font-medium"
          style={{ color: accentColor ?? undefined }}
        >
          {highlightText}
        </p>
      )}

      <Button
        type="submit"
        className={cn("w-full gap-2 shadow-lg shadow-primary/20", accentColor && "border-0 bg-none")}
        style={accentColor ? { backgroundColor: accentColor } : undefined}
        size="lg"
        disabled={pending}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Pagar {formatCurrency(total, currency as "MZN" | "ZAR")}
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Compra 100% segura
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-amber-500" /> Entrega imediata
        </span>
      </div>
    </form>
  );
}
