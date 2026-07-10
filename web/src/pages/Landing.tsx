import { Link } from "react-router-dom";
import { PublicNav } from "../components/PublicNav";
import { InstallAppButton } from "../components/InstallAppButton";
import { WithdrawalInfoSection } from "../components/WithdrawalInfoSection";

const METHODS = ["M-Pesa", "e-Mola", "mKesh", "Visa & Mastercard", "PayFast (ZAR)"];

export function Landing() {
  return (
    <div>
      <PublicNav />

      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-100">
            Infraestrutura de pagamentos para Moçambique
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Aceite pagamentos, venda produtos e gira os seus saques — tudo numa
            única plataforma.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            Crie links de pagamento, cadastre produtos e receba por M-Pesa,
            e-Mola, mKesh, Visa/Mastercard e PayFast. Cada saque e cada
            produto passa por aprovação antes de ficar ativo.
          </p>
          <div className="mt-10 flex gap-4">
            <Link
              to="/signup"
              className="rounded-lg bg-brand-500 px-6 py-3 font-semibold hover:bg-brand-600"
            >
              Começar Agora
            </Link>
            <a
              href="#como-funciona"
              className="rounded-lg border border-white/20 px-6 py-3 font-semibold hover:bg-white/10"
            >
              Como Funciona
            </a>
            <InstallAppButton className="rounded-lg border border-white/20 px-6 py-3 font-semibold hover:bg-white/10" />
          </div>
        </div>
      </section>

      <section id="metodos" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold text-brand-900">Métodos de pagamento</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          {METHODS.map((m) => (
            <div
              key={m}
              className="rounded-xl border border-slate-200 px-4 py-6 text-center font-semibold text-slate-700"
            >
              {m}
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-brand-900">Como funciona</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "1. Cadastre-se",
                text: "Crie a sua conta de merchant e complete o seu perfil de negócio.",
              },
              {
                title: "2. Cadastre produtos e links",
                text: "Adicione produtos ou crie links de pagamento avulsos — cada um passa por aprovação do admin.",
              },
              {
                title: "3. Peça o saque",
                text: "Quando tiver saldo disponível, peça o saque. Um admin revê e confirma o pagamento.",
              },
            ].map((step) => (
              <div key={step.title} className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-brand-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WithdrawalInfoSection />

      <footer id="contacto" className="border-t border-slate-200 py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} PagaJá. Plataforma de pagamentos para Moçambique.
      </footer>
    </div>
  );
}
