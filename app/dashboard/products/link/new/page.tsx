import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { PaymentLinkForm } from "@/components/products/payment-link-form";

export default async function NewPaymentLinkPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold">Novo Link de Pagamento</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mais rápido que um produto — sem categoria, sem página no marketplace. Fica disponível depois da aprovação de
        um administrador.
      </p>
      <div className="mt-6">
        <PaymentLinkForm userId={user.id} currency={profile.currency as "MZN" | "ZAR"} />
      </div>
    </div>
  );
}
