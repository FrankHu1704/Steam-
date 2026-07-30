import { notFound } from "next/navigation";
import { Download, CheckCircle2, Clock, XCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDownloadLinks } from "@/lib/actions/downloads";
import { getOrderStatus } from "@/lib/actions/checkout";
import { UpsellOfferCard } from "@/components/checkout/checkout-form";
import { formatCurrency } from "@/lib/utils";

export default async function OrderAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total_amount, currency, buyer_name, products(title, cover_image_url)")
    .eq("id", id)
    .single();

  if (!order) notFound();

  // Re-check with the payment provider on every visit (not just the live
  // checkout poll) so a stale "pending" doesn't just sit there forever if
  // the customer left and came back later.
  const status = order.status === "pending" ? (await getOrderStatus(id)).status ?? order.status : order.status;

  const product = order.products as unknown as { title: string; cover_image_url: string | null } | null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="bg-brand-gradient px-6 py-8 text-center text-white">
          <p className="text-lg font-bold">
            Paga<span className="opacity-90">Já</span>
          </p>
        </div>

        <div className="p-6">
          {status === "paid" ? (
            <PaidState orderId={order.id} productTitle={product?.title ?? "o seu produto"} />
          ) : status === "pending" ? (
            <div className="text-center">
              <Clock className="mx-auto h-10 w-10 text-amber-500" />
              <p className="mt-3 font-semibold">Pagamento ainda pendente</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assim que o pagamento de {formatCurrency(order.total_amount, order.currency as "MZN" | "ZAR")} for
                confirmado, o conteúdo aparece aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="mt-3 font-semibold">Pagamento não concluído</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Este pedido não tem um pagamento confirmado. Contacte o vendedor se acha que isto é um erro.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function PaidState({ orderId, productTitle }: { orderId: string; productTitle: string }) {
  const result = await getDownloadLinks(orderId);
  const files = result.files ?? [];

  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
      <p className="mt-3 font-semibold">Pagamento confirmado!</p>
      <p className="mt-1 text-sm text-muted-foreground">Obrigado pela compra de {productTitle}. Aqui estão os seus ficheiros:</p>
      <div className="mt-5 space-y-2 text-left">
        {files.length === 0 && <p className="text-center text-sm text-muted-foreground">Nenhum ficheiro disponível.</p>}
        {files.map((f, i) => (
          <a
            key={i}
            href={f.url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm hover:border-primary"
          >
            <Download className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{f.name}</span>
          </a>
        ))}
      </div>
      <UpsellOfferCard orderId={orderId} />
    </div>
  );
}
