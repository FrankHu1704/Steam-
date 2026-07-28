import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getRecentLogs } from "@/lib/data/admin";

function dotStyle(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("error") || a.includes("failed")) return "bg-red-500";
  if (a.includes("webhook")) return "bg-primary";
  if (a.includes("debug")) return "bg-amber-500";
  return "bg-emerald-500";
}

export default async function AdminLogsPage() {
  const logs = await getRecentLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logs</h1>
        <p className="text-sm text-muted-foreground">Últimos {logs.length} eventos registados no sistema.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <ScrollText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sem registos ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-4 text-sm hover:bg-muted/30">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotStyle(log.action))} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium capitalize">{log.action.replace(/_/g, " ")}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("pt-MZ")}
                      </span>
                    </div>
                    {log.target_table && (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {log.target_table} · {log.target_id}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
