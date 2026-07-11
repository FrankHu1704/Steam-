import { Download as DownloadIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getMyPaidFiles } from "@/lib/data/buyer";
import { getDownloadLinks } from "@/lib/actions/downloads";

export default async function DownloadsPage() {
  const files = await getMyPaidFiles();

  const orderIds = Array.from(new Set(files.map((f) => f.orderId)));
  const linksByOrder = new Map<string, { name: string; url: string | null }[]>();
  await Promise.all(
    orderIds.map(async (orderId) => {
      const result = await getDownloadLinks(orderId);
      linksByOrder.set(orderId, result.files ?? []);
    })
  );

  const rows = files.map((f) => {
    const links = linksByOrder.get(f.orderId) ?? [];
    const match = links.find((l) => l.name === f.fileName);
    return { ...f, url: match?.url ?? null };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Downloads</h1>
        <p className="text-sm text-muted-foreground">Ficheiros dos produtos que comprou, prontos a transferir.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Ainda não tem ficheiros disponíveis.</p>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.fileName}</p>
                    <p className="text-xs text-muted-foreground">{row.productTitle}</p>
                  </div>
                  {row.url ? (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <DownloadIcon className="h-4 w-4" /> Transferir
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Indisponível</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
