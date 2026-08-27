'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, History } from 'lucide-react'

import { MaintenanceStatusBadge } from '@/components/shared/status-badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { isRemoteBackend } from '@/lib/api'
import { formatRelative, initials } from '@/lib/format'
import { useRealDatabase } from '@/lib/hooks/use-real-database'
import { buildRecentActivity, useVellor } from '@/lib/store'

/** Quantidade de atendimentos exibidos no feed. */
const ACTIVITY_LIMIT = 8

/** Feed das últimas manutenções movimentadas, da mais recente para a mais antiga. */
function RecentActivity() {
  const vellor = useVellor()
  const real = useRealDatabase()
  const remote = isRemoteBackend()

  const db = remote ? real.db : vellor.db

  const entries = useMemo(() => buildRecentActivity(db, ACTIVITY_LIMIT), [db])

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base">Atividades recentes</CardTitle>
        <CardDescription>Últimos atendimentos registrados pela equipe</CardDescription>
        <CardAction>
          <Link
            href="/historico"
            className="focus-ring inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            Ver histórico
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0">
        {entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhuma atividade registrada."
            description="Assim que uma manutenção for iniciada ou concluída, ela aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/inventario/${entry.computerId}`}
                  className="focus-ring flex items-center gap-3 px-6 py-3 transition-colors hover:bg-accent"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
                  >
                    {initials(entry.technicianName)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.computerLabel}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.service} · {entry.technicianName}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <MaintenanceStatusBadge status={entry.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(entry.date)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export { RecentActivity }
