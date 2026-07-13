import Link from "next/link";

const STEPS = [
  {
    title: "1. Cria o teu agente",
    body: "Regista-te, dá um nome ao teu agente LunaAI e prepara-o para atender no teu WhatsApp.",
  },
  {
    title: "2. Conecta o teu número",
    body: "Insere o número de WhatsApp, recebe o código de pareamento de 8 dígitos e associa em Dispositivos Ligados.",
  },
  {
    title: "3. Treina como ele responde",
    body: "Define o tom, o conhecimento do teu negócio e ensina respostas específicas — a identidade FRANK AI SOLUTIONS nunca é substituída.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-6">
      <section className="flex max-w-3xl flex-col items-center gap-6 py-24 text-center">
        <span className="rounded-full border border-border bg-card px-4 py-1 text-xs text-accent">
          Tecnologia Moçambicana 🇲🇿
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Liga a <span className="text-accent">LunaAI</span> ao teu WhatsApp
        </h1>
        <p className="max-w-xl text-lg text-emerald-100/70">
          Cria o teu próprio agente de IA, conecta-o ao teu número e ensina-o a responder do
          jeito certo — sempre com a identidade FRANK AI SOLUTIONS protegida.
        </p>
        <div className="flex gap-3">
          <Link
            href="/register"
            className="rounded-md bg-accent px-5 py-2.5 font-medium text-black hover:bg-emerald-400"
          >
            Começar agora
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border px-5 py-2.5 font-medium hover:border-accent"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="grid w-full max-w-4xl gap-4 pb-24 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.title} className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-2 font-medium text-accent">{step.title}</h2>
            <p className="text-sm text-emerald-100/70">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="mb-24 max-w-2xl rounded-lg border border-border bg-card p-6 text-center">
        <h2 className="mb-2 font-medium">🔒 Identidade protegida</h2>
        <p className="text-sm text-emerald-100/70">
          Podes ensinar o teu agente a falar do teu negócio, produtos e tom de voz — mas a base
          LunaAI / FRANK AI SOLUTIONS nunca pode ser apagada, ignorada ou substituída, mesmo se
          alguém tentar por instruções de treino ou mensagens recebidas.
        </p>
      </section>
    </div>
  );
}
