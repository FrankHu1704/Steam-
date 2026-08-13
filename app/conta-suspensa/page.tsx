import { MessageCircle, ShieldOff } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";

export default async function ContaSuspensaPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;

  return (
    <AuthCard title="Conta suspensa">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldOff className="h-7 w-7 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">
          A sua conta foi suspensa por um administrador e o acesso foi bloqueado. O seu saldo e os seus dados
          continuam guardados.
        </p>
        {motivo && (
          <div className="w-full rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left text-sm">
            <p className="text-xs font-medium text-muted-foreground">Motivo</p>
            <p className="mt-0.5">{motivo}</p>
          </div>
        )}
        <a
          href="https://wa.me/258849311757"
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          <MessageCircle className="h-4 w-4" /> Falar com o suporte
        </a>
      </div>
    </AuthCard>
  );
}
