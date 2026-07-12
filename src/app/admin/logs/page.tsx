'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { AuditLog } from '@/types/database'

type AdminAuditLog = AuditLog & { profiles?: { full_name: string; company_name: string | null } }

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([])

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then((r) => r.json())
      .then((res) => setLogs(res?.data ?? []))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Auditoria</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Registo de acções administrativas e eventos do sistema.</p>
      </div>

      <Card>
        <CardContent>
          <div className="space-y-3">
            {logs.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Sem registos de auditoria.</p>}
            {logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.action}</Badge>
                    {log.entity_type && <span className="text-xs text-slate-400">{log.entity_type}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {log.profiles?.company_name || log.profiles?.full_name || 'Sistema'}
                  </p>
                  {Object.keys(log.metadata || {}).length > 0 && (
                    <pre className="mt-1 max-w-xl overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(log.created_at)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
