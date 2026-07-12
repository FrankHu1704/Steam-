import { Cloud, Bot } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="container-px mx-auto max-w-5xl text-center">
        <div className="mb-8 flex justify-center">
          <div className="animate-float flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-primary/20">
            <Cloud className="h-12 w-12 text-primary-light" strokeWidth={1.5} />
            <Bot className="h-12 w-12 text-accent" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="animate-fade-up text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          <span className="gradient-text">Hospedagem de Bots Confiável</span>
          <br />
          <span className="text-white">Senga Host</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg text-white/70 sm:text-xl [animation-delay:100ms]">
          Inicie seu bot a partir de apenas{" "}
          <span className="font-semibold text-accent">100 MT/mês</span>
        </p>

        <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-4 [animation-delay:200ms] sm:flex-row">
          <a
            href="#planos"
            className="w-full rounded-xl bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accent-dark hover:shadow-accent/50 sm:w-auto"
          >
            Escolher Plano →
          </a>
          <a
            href="#faq"
            className="w-full rounded-xl border border-white/15 px-8 py-4 text-base font-semibold text-white/90 transition hover:bg-white/5 sm:w-auto"
          >
            Tirar Dúvidas
          </a>
        </div>

        <p className="mt-6 text-sm text-white/40">
          Sem taxas escondidas · Comece agora, cancele quando quiser
        </p>
      </div>
    </section>
  );
}
