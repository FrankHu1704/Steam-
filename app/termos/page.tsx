import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Termos de Serviço — PagaJá",
  description: "Termos e condições de utilização da plataforma PagaJá.",
};

export default function TermosPage() {
  return (
    <>
      <SiteNav />
      <main className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold">Termos de Serviço</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {new Date().toLocaleDateString("pt-MZ")}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Sobre a PagaJá</h2>
            <p className="mt-2">
              A PagaJá é uma plataforma moçambicana que permite a produtores criar, vender e entregar infoprodutos
              digitais (eBooks, cursos, mentorias, templates, software e outros ficheiros digitais) a compradores,
              com pagamento por M-Pesa, e-Mola, mKesh, cartão e outros métodos suportados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Contas e elegibilidade</h2>
            <p className="mt-2">
              Para vender na PagaJá é necessário criar uma conta com dados verdadeiros. É responsável por manter a
              confidencialidade da sua password e por toda a atividade realizada através da sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Moderação de produtos</h2>
            <p className="mt-2">
              Todo o produto submetido passa por revisão antes de ficar disponível para venda. A PagaJá reserva-se
              o direito de rejeitar, pausar ou remover qualquer produto que viole estes Termos ou a nossa{" "}
              <Link href="/conteudo" className="font-medium text-primary hover:underline">
                Política de Conteúdo
              </Link>
              , a qualquer momento e sem aviso prévio quando a infração for grave.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Pagamentos, taxas e saques</h2>
            <p className="mt-2">
              A PagaJá cobra uma percentagem sobre cada venda e sobre cada levantamento, detalhadas na nossa página
              de{" "}
              <Link href="/taxas" className="font-medium text-primary hover:underline">
                Taxas
              </Link>
              . Os valores só ficam disponíveis para saque depois de confirmado o pagamento pelo método escolhido
              pelo comprador.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Propriedade intelectual</h2>
            <p className="mt-2">
              Cada produtor é o único responsável pelo conteúdo que publica e garante deter os direitos necessários
              sobre ele. É proibido publicar conteúdo de terceiros (textos, imagens, vídeos, documentos ou dados)
              sem autorização — ver a nossa{" "}
              <Link href="/conteudo" className="font-medium text-primary hover:underline">
                Política de Conteúdo
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Suspensão e encerramento de conta</h2>
            <p className="mt-2">
              Podemos suspender ou encerrar permanentemente qualquer conta que viole estes Termos, sem aviso prévio
              e sem direito a recurso, quando a infração colocar em risco outros utilizadores, terceiros ou a
              integridade da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Isenção de responsabilidade</h2>
            <p className="mt-2">
              A PagaJá atua como intermediária entre produtores e compradores. Não somos responsáveis pelo conteúdo,
              qualidade ou veracidade dos produtos vendidos por terceiros na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Alterações a estes Termos</h2>
            <p className="mt-2">
              Podemos atualizar estes Termos periodicamente. Alterações significativas serão comunicadas através da
              plataforma ou por email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Contacto</h2>
            <p className="mt-2">
              Dúvidas sobre estes Termos podem ser enviadas através do email de suporte indicado na plataforma.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
