import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallAppButton } from "@/components/install-app-button";

const LINKS = [
  { href: "#recursos", label: "Recursos" },
  { href: "#diferenciais", label: "Porque a PayNow" },
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#metodos", label: "Métodos de Pagamento" },
  { href: "#faq", label: "FAQ" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="container flex items-center justify-between py-4">
        <Link href="/" className="text-lg font-bold">
          Pay<span className="text-gradient">Now</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          {LINKS.map((l) =>
            l.href.startsWith("/") ? (
              <Link key={l.href} href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} className="hover:text-foreground">
                {l.label}
              </a>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <InstallAppButton />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Criar Conta</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
