import { ShieldAlert, Ban } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Política de Conteúdo — PagaJá",
  description: "Regras sobre o que pode e não pode ser vendido na PagaJá.",
};

const PROHIBITED_ITEMS = [
  "Rifas, sorteios ou apostas ilegais",
  "Esquemas de pirâmide, burlas ou promessas de rendimento garantido",
  "Conteúdo que ensine ou incentive fraudes, golpes ou invasão de sistemas informáticos",
  "Uso indevido de documentos, imagens, vídeos ou dados pessoais de terceiros sem autorização",
  "Falsificação de identidade ou personificação de terceiros",
  "Discurso de ódio, racismo ou discriminação de qualquer tipo",
  "Conteúdo xenófobo",
  "Exploração ou sexualização de menores, sob qualquer forma",
  "Conteúdo abusivo ou que incentive atividades ilegais",
  "Qualquer prática que coloque em risco compradores, produtores ou a integridade da plataforma",
];

export default function ConteudoPage() {
  return (
    <>
      <SiteNav />
      <main className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold">Política de Conteúdo</h1>
        <p className="mt-3 text-muted-foreground">
          A PagaJá existe para democratizar o acesso ao conhecimento e gerar oportunidades de rendimento de forma
          ética. Para isso, todo o conteúdo vendido na plataforma deve respeitar a lei moçambicana e os direitos de
          terceiros.
        </p>

        <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <Ban className="h-5 w-5" />
            Conteúdo estritamente proibido
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {PROHIBITED_ITEMS.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-destructive">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-6">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Consequências</p>
            <p className="mt-1">
              Todo o conteúdo submetido é revisto antes de ser aprovado. Infrações a esta política resultam em
              rejeição ou remoção do produto. Infrações graves — nomeadamente as listadas acima — podem resultar em
              suspensão ou banimento imediato e permanente da conta, sem aviso prévio e sem direito a recurso.
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Se encontrar um produto que viole esta política, contacte o suporte da PagaJá para que possamos analisar.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
