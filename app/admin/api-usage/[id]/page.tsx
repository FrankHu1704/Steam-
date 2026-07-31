import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiLogTerminal } from "@/components/admin/api-log-terminal";
import { getProducerApiLogs } from "@/lib/data/admin";

export default async function AdminApiUsageProducerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProducerApiLogs(id);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/api-usage"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Uso da API
        </Link>
        <div className="mt-3">
          <h1 className="text-2xl font-bold">Logs de API — {data.producerName}</h1>
          <p className="text-sm text-muted-foreground">
            {data.producerEmail} · últimas {data.logs.length} chamadas a /api/v1/*.
          </p>
        </div>
      </div>

      <ApiLogTerminal producerName={data.producerName} producerId={id} logs={data.logs} />
    </div>
  );
}
