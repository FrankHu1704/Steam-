import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KycUploadForm } from "@/components/dashboard/kyc-upload-form";
import { getCurrentUserAndProfile } from "@/lib/data/profile";

export default async function VerificacaoPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verificação de Identidade</h1>
        <p className="text-sm text-muted-foreground">
          Confirme a sua identidade para poder solicitar saques na PayNow.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Documento de Identidade</CardTitle>
        </CardHeader>
        <CardContent>
          <KycUploadForm userId={user.id} profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
