import Link from "next/link";

const INSTAGRAM_URL = "https://www.instagram.com/pagaja.co.mz?igsh=MThwNXl1eWx1eGtvcA==";
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/Ga5A5WwQ4EJ9yI8DaR860t?s=cl&p=a&ilr=1&amv=1";

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
            <li><Link href="/marketplace">Marketplace</Link></li>
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
      <p className="container mt-10 text-xs text-muted-foreground">
        © {new Date().getFullYear()} PagaJá. Todos os direitos reservados.
      </p>
    </footer>
  );
}
