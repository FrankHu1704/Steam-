import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const INSTAGRAM_URL = "https://www.instagram.com/pagaja.co.mz?igsh=MThwNXl1eWx1eGtvcA==";
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/Ga5A5WwQ4EJ9yI8DaR860t?s=cl&p=a&ilr=1&amv=1";

const PARTNERS = [
  { name: "Frank AI Solutions", logo: "/partner-logos/frank-ai-solutions.jpg", wide: true },
  { name: "Visa & Mastercard", logo: "/partner-logos/visa.jpg" },
  { name: "mKesh", logo: "/partner-logos/mkesh.jpg" },
  { name: "e-Mola", logo: "/partner-logos/emola.jpg" },
  { name: "M-Pesa", logo: "/partner-logos/mpesa.jpg" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="container grid gap-8 md:grid-cols-5">
        <div>
          <p className="text-lg font-bold">
            Paga<span className="text-gradient">Já</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            A plataforma moçambicana para vender infoprodutos.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Produto</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="#recursos">Recursos</a></li>
            <li><a href="#metodos">Métodos de Pagamento</a></li>
            <li><Link href="/taxas">Taxas</Link></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Conta</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/signup">Criar Conta</Link></li>
            <li><Link href="/login">Entrar</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Comunidade</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
                Grupo do WhatsApp
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/termos">Termos de Serviço</Link></li>
            <li><Link href="/conteudo">Política de Conteúdo</Link></li>
            <li><Link href="/privacidade">Política de Privacidade</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mt-10 border-t border-border pt-8">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parceiros</p>
        <div className="relative mt-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee gap-4">
            {[...PARTNERS, ...PARTNERS].map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-xl bg-zinc-950 p-3",
                  p.wide ? "h-16 w-40" : "h-16 w-16"
                )}
              >
                <Image
                  src={p.logo}
                  alt={p.name}
                  width={p.wide ? 160 : 64}
                  height={64}
                  className="h-full w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="container mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} PagaJá. Todos os direitos reservados.
      </p>
    </footer>
  );
}
