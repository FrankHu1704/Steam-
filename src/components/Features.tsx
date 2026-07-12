import { Zap, Rocket, Wallet, ShieldCheck, LucideIcon } from "lucide-react";

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Zap,
    title: "Uptime 99.9%",
    description: "Seu bot online 24/7, sem quedas inesperadas.",
  },
  {
    icon: Rocket,
    title: "Deploy Instantâneo",
    description: "Suba seu bot e comece a rodar em minutos.",
  },
  {
    icon: Wallet,
    title: "Preços Competitivos",
    description: "Planos a partir de 100 MT/mês, sem surpresas.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança Garantida",
    description: "Infraestrutura protegida e backups automáticos.",
  },
];

export default function Features() {
  return (
    <section className="container-px mx-auto max-w-6xl py-16">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="card-glass p-6 text-center transition hover:-translate-y-1 hover:border-primary/40 hover:bg-white/[0.06]"
          >
            <div className="mb-3 flex justify-center">
              <f.icon className="h-9 w-9 text-accent" strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-white/60">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
