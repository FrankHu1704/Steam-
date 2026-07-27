import Link from "next/link";
import { Facebook, Music2, ChartLine, Megaphone, MessageCircle, Bell, Code2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getIntegrationsOverview } from "@/lib/data/integrations";
import { hasPushSubscription } from "@/lib/actions/push";

export default async function IntegrationsPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) return null;

  const [overview, pushActive] = await Promise.all([getIntegrationsOverview(user.id), hasPushSubscription()]);

  const apps = [
    {
      icon: Facebook,
      iconClass: "bg-[#1877F2]/10 text-[#1877F2]",
      name: "Facebook Pixel",
      description: "Meça conversões dos seus anúncios no Facebook e Instagram.",
      status:
        overview.productsWithFacebookPixel > 0
          ? `Ativo em ${overview.productsWithFacebookPixel} produto${overview.productsWithFacebookPixel === 1 ? "" : "s"}`
          : "Não configurado",
      active: overview.productsWithFacebookPixel > 0,
      href: "/dashboard/products",
    },
    {
      icon: Music2,
      iconClass: "bg-foreground/10 text-foreground",
      name: "TikTok Pixel",
      description: "Meça conversões das suas campanhas no TikTok Ads.",
      status:
        overview.productsWithTiktokPixel > 0
          ? `Ativo em ${overview.productsWithTiktokPixel} produto${overview.productsWithTiktokPixel === 1 ? "" : "s"}`
          : "Não configurado",
      active: overview.productsWithTiktokPixel > 0,
      href: "/dashboard/products",
    },
    {
      icon: ChartLine,
      iconClass: "bg-amber-500/10 text-amber-600",
      name: "Google Analytics",
      description: "Acompanhe visitas e comportamento no site do seu produto.",
      status:
        overview.productsWithGoogleAnalytics > 0
          ? `Ativo em ${overview.productsWithGoogleAnalytics} produto${overview.productsWithGoogleAnalytics === 1 ? "" : "s"}`
          : "Não configurado",
      active: overview.productsWithGoogleAnalytics > 0,
      href: "/dashboard/products",
    },
    {
      icon: Megaphone,
      iconClass: "bg-primary/10 text-primary",
      name: "Campanhas & UTMs",
      description: "Veja de onde vêm as suas vendas: origem, meio e campanha.",
      status: "Sistema próprio da PagaJá",
      active: true,
      href: "/dashboard/campaigns",
    },
    {
      icon: Code2,
      iconClass: "bg-secondary/10 text-secondary",
      name: "Script Personalizado",
      description: "UTMify ou qualquer outra ferramenta de rastreamento não listada acima.",
      status:
        overview.productsWithCustomScript > 0
          ? `Ativo em ${overview.productsWithCustomScript} produto${overview.productsWithCustomScript === 1 ? "" : "s"}`
          : "Não configurado",
      active: overview.productsWithCustomScript > 0,
      href: "/dashboard/products",
    },
    {
      icon: MessageCircle,
      iconClass: "bg-emerald-500/10 text-emerald-600",
      name: "Receção automática por WhatsApp",
      description: "Os seus clientes recebem o link de acesso ao produto automaticamente por WhatsApp.",
      status: "Sempre ativo",
      active: true,
      href: null,
    },
    {
      icon: Bell,
      iconClass: "bg-violet-500/10 text-violet-600",
      name: "Notificações Push",
      description: "Receba um aviso no telemóvel a cada nova venda.",
      status: pushActive ? "Ativo neste dispositivo" : "Não ativado neste dispositivo",
      active: pushActive,
      href: "/dashboard/settings",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Ferramentas de marketing e rastreamento que pode ligar aos seus produtos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map((app) => {
          const content = (
            <Card key={app.name} className="h-full transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="flex items-start gap-4 p-5">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${app.iconClass}`}>
                  <app.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{app.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{app.description}</p>
                  <p
                    className={`mt-2 text-xs font-medium ${
                      app.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {app.status}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
          return app.href ? (
            <Link key={app.name} href={app.href}>
              {content}
            </Link>
          ) : (
            content
          );
        })}
      </div>
    </div>
  );
}
