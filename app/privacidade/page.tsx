import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Política de Privacidade — PagaJá",
  description: "Como a PagaJá recolhe, usa e protege os seus dados pessoais.",
};

export default function PrivacidadePage() {
  return (
    <>
      <SiteNav />
      <main className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString("pt-MZ")}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Dados que recolhemos</h2>
            <p className="mt-2">
              Recolhemos os dados que fornece diretamente: nome, email, telefone e, quando aplicável, foto de
              perfil. Nas compras, recolhemos também o nome, email e telefone indicados no checkout, mesmo sem
              criar conta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Dados de pagamento</h2>
            <p className="mt-2">
              A PagaJá não armazena dados de cartões ou credenciais de dinheiro móvel. Os pagamentos são processados
              pela Debito Pay (M-Pesa, e-Mola, mKesh, cartão), que trata diretamente essas informações sob as suas
              próprias medidas de segurança.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Como usamos os seus dados</h2>
            <p className="mt-2">
              Usamos os seus dados para processar compras, entregar produtos digitais, calcular comissões de
              afiliados, processar saques, enviar notificações sobre a sua conta (confirmação de compra, aprovação
              de produtos, novidades da plataforma) e cumprir obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Armazenamento e segurança</h2>
            <p className="mt-2">
              Os dados são armazenados de forma encriptada em servidores da Supabase, com controlo de acesso a
              nível de linha (Row Level Security) — cada utilizador só acede aos seus próprios dados, salvo o
              necessário para o funcionamento da plataforma (ex: um produtor vê os pedidos dos seus produtos).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Partilha com terceiros</h2>
            <p className="mt-2">
              Partilhamos dados apenas com prestadores de serviço necessários ao funcionamento da plataforma: a
              Debito Pay (processamento de pagamentos) e o Resend (envio de emails transacionais). Nunca vendemos
              os seus dados a terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Os seus direitos</h2>
            <p className="mt-2">
              Pode aceder, corrigir ou pedir a eliminação dos seus dados a qualquer momento, através do seu perfil
              na plataforma ou contactando o suporte.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Contacto</h2>
            <p className="mt-2">Dúvidas sobre esta política podem ser enviadas através do email de suporte indicado na plataforma.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
