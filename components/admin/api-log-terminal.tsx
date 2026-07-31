import type { ApiCallLog } from "@/types/database";

function statusColor(status: number): string {
  if (status < 300) return "text-emerald-400";
  if (status < 400) return "text-sky-400";
  if (status < 500) return "text-amber-400";
  return "text-red-400";
}

function timestamp(iso: string): string {
  return iso.replace("T", " ").slice(0, 19);
}

export function ApiLogTerminal({
  producerName,
  producerId,
  logs,
}: {
  producerName: string;
  producerId: string;
  logs: ApiCallLog[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black font-mono text-xs shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span className="ml-2 truncate text-[11px] text-zinc-500">
          {producerName.toLowerCase().replace(/\s+/g, "-")}@pagaja-api:~$
        </span>
      </div>
      <div className="max-h-[560px] space-y-1 overflow-y-auto p-4 leading-relaxed text-zinc-300">
        <p className="text-zinc-500"># tail -n {logs.length} /var/log/pagaja/api/{producerId}.log</p>
        {logs.length === 0 ? (
          <p className="text-zinc-600">-- sem chamadas registadas --</p>
        ) : (
          logs.map((log) => (
            <p key={log.id} className="whitespace-pre-wrap break-all">
              <span className="text-zinc-600">[{timestamp(log.created_at)}]</span>{" "}
              <span className="text-sky-400">{log.method}</span>{" "}
              <span className="text-zinc-300">{log.endpoint}</span>{" "}
              <span className={statusColor(log.status_code)}>→ {log.status_code}</span>
            </p>
          ))
        )}
        <p className="flex items-center gap-1.5 pt-1 text-emerald-400">
          <span>$</span>
          <span className="inline-block h-3.5 w-1.5 animate-pulse bg-emerald-400" />
        </p>
      </div>
    </div>
  );
}
