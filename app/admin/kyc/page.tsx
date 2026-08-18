import { IdCard } from "lucide-react";
import { KycReview } from "@/components/admin/kyc-review";
import { getPendingKycSubmissions } from "@/lib/data/admin";

export default async function AdminKycPage() {
  const pending = await getPendingKycSubmissions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verificação KYC</h1>
        <p className="text-sm text-muted-foreground">
          Revê os documentos de identidade enviados pelos produtores antes de liberar os saques.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border py-16 text-center">
          <IdCard className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhuma verificação pendente</p>
          <p className="text-sm text-muted-foreground">Todos os pedidos de verificação foram avaliados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((account) => (
            <KycReview key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
