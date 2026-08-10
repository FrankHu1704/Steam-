import { redirect } from "next/navigation";
import { QrCode, FileBarChart, FileText, Image as ImageIcon, Mail, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkAndQrTool } from "@/components/tools/link-and-qr-tool";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getMyProducts } from "@/lib/data/products";

export default async function FerramentasPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  const products = await getMyProducts(user.id);
  const productOptions = products.filter((p) => p.status === "approved").map((p) => ({ id: p.id, title: p.title, slug: p.slug }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ferramentas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Para impulsionar as suas vendas.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Gerador de Links + QR Code</h2>
          </div>
          <LinkAndQrTool products={productOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-primary" />
            <div>
              <h2 className="font-semibold">Relatórios</h2>
              <p className="text-xs text-muted-foreground">Descarregue todas as suas vendas em CSV.</p>
            </div>
          </div>
          <a href="/api/reports/orders">
            <Button type="button" variant="outline" size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Descarregar CSV
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <FileText className="h-4 w-4 text-primary" />
          <div>
            <h2 className="font-semibold">Página de Vendas</h2>
            <p className="text-xs text-muted-foreground">
              Já é gerada automaticamente para cada produto aprovado (em "Produtos" → "Link de venda") — não precisa
              de criar nada à parte.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="opacity-60">
          <CardContent className="flex items-center gap-3 p-6">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">E-mail Marketing</h2>
              <p className="text-xs text-muted-foreground">Em breve.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-60">
          <CardContent className="flex items-center gap-3 p-6">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">Banco de Imagens</h2>
              <p className="text-xs text-muted-foreground">Em breve.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
