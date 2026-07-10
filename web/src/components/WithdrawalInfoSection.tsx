import { Zap, Smartphone, Wallet, Globe, ShieldCheck, CircleAlert } from "lucide-react";

const METHODS = [
  {
    icon: Smartphone,
    name: "Saque via M-Pesa",
    fee: "5%",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: Wallet,
    name: "Saque via e-Mola",
    fee: "5%",
    color: "text-brand-600 bg-brand-50",
  },
  {
    icon: Globe,
    name: "Saque via Payoneer",
    fee: "5%",
    color: "text-emerald-600 bg-emerald-50",
  },
];

const NOTICES = [
  "A taxa é descontada automaticamente no momento do saque.",
  "O valor líquido recebido será o valor solicitado menos a taxa de 5%.",
  "O processamento pode sofrer atrasos apenas em casos de manutenção ou instabilidade da operadora.",
  "Todas as taxas devem ser exibidas de forma transparente antes da confirmação do saque.",
];

export function WithdrawalInfoSection() {
  return (
    <section id="saques" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-500">
            💸 Saques
          </p>
          <h2 className="mt-2 text-3xl font-bold text-brand-900">
            Informações sobre Saques
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            Regras simples e transparentes para você saber exatamente quanto
            vai receber, antes de confirmar.
          </p>
        </div>

        {/* Processamento — destaque */}
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white sm:flex-row sm:gap-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Zap className="h-7 w-7" strokeWidth={2.2} />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-lg font-semibold">Processamento Imediato</p>
            <p className="mt-1 text-sm text-brand-100">
              Todos os saques são processados na mesma hora, 24 horas por dia,
              7 dias por semana.
            </p>
          </div>
        </div>

        {/* Métodos de saque */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {METHODS.map((m) => (
            <div
              key={m.name}
              className="rounded-2xl border border-slate-200 p-6 shadow-sm transition hover:shadow-md"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <p className="mt-4 font-semibold text-brand-900">{m.name}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-sm text-slate-500">Taxa:</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-bold text-brand-900">
                  {m.fee} do valor solicitado
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Avisos importantes */}
        <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 text-amber-800">
            <CircleAlert className="h-5 w-5" strokeWidth={2.2} />
            <p className="font-semibold">Avisos importantes</p>
          </div>
          <ul className="mt-4 space-y-2.5">
            {NOTICES.map((notice) => (
              <li key={notice} className="flex items-start gap-2.5 text-sm text-amber-900">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {notice}
              </li>
            ))}
          </ul>
        </div>

        {/* Nota de transparência */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600" strokeWidth={2.2} />
          <p className="text-sm font-medium text-emerald-800">
            PagaJá trabalha com total transparência para garantir rapidez,
            segurança e confiança em todas as transações.
          </p>
        </div>
      </div>
    </section>
  );
}
