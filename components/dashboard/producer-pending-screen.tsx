import { Clock, XCircle, MessageCircle } from "lucide-react";

export function ProducerPendingScreen({
  status,
  reason,
}: {
  status: "pending" | "rejected";
  reason?: string | null;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="mb-4 flex items-center justify-center gap-2 text-xl font-bold">
          Pay<span className="text-gradient">Now</span>
        </div>

        {status === "pending" ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
            <h1 className="mt-4 text-lg font-bold">A sua conta está em análise</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pediu para começar a vender na PayNow. Um administrador vai rever a sua conta antes de lhe dar acesso
              — isto é uma medida contra fraudes e burlas na plataforma. Assim que for aprovada, recebe um email.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="mt-4 text-lg font-bold">O seu pedido não foi aprovado</h1>
            {reason && (
              <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left text-sm">
                <p className="text-xs font-medium text-muted-foreground">Motivo</p>
                <p className="mt-0.5">{reason}</p>
              </div>
            )}
          </>
        )}

        <a
          href="https://wa.me/258849311757"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          <MessageCircle className="h-4 w-4" /> Falar com o suporte
        </a>
      </div>
    </main>
  );
}
