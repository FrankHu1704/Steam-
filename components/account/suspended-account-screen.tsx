import { Ban, MessageCircle, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export function SuspendedAccountScreen({ reason }: { reason?: string | null }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <Ban className="h-9 w-9 text-destructive" />
        </div>

        <h1 className="mt-6 text-2xl font-bold">Conta Suspensa</h1>
        <p className="mt-2 text-sm text-muted-foreground">Detectámos uma irregularidade na sua conta.</p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-left">
          <p className="text-xs font-semibold text-primary">Motivo da suspensão</p>
          <p className="mt-1 text-sm text-muted-foreground">{reason?.trim() || "Não especificado."}</p>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Se acredita que isso é um erro ou deseja mais esclarecimentos, fale com o nosso suporte.
        </p>

        <a
          href="https://wa.me/258849311757"
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Falar com o Suporte
        </a>

        <form action={signOut} className="mt-4">
          <input type="hidden" name="next" value="/login" />
          <button
            type="submit"
            className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:underline"
          >
            <LogOut className="h-4 w-4" /> Terminar sessão
          </button>
        </form>
      </div>
    </main>
  );
}
