import { Card, CardContent } from "@/components/ui/card";
import { getRecentLogs } from "@/lib/data/admin";

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
            <p className="py-16 text-center text-sm text-muted-foreground">Sem registos ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{log.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-MZ")}
                    </span>
                  </div>
                  {log.target_table && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {log.target_table} · {log.target_id}
                    </p>
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
