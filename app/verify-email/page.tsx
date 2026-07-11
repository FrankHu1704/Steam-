import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";

export default function VerifyEmailPage() {
  return (
    <AuthCard title="Confirme o seu email">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Enviámos um link de confirmação para o seu email. Clique nele para ativar a sua conta e
          entrar no dashboard.
        </p>
      </div>
    </AuthCard>
  );
}
