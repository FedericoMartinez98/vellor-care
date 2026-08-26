'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'

import { PreventiveHealthBadge } from '@/components/shared/status-badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { daysUntil } from '@/lib/format'
import { computerIsCritical, criticalReasons, preventiveHealthOf } from '@/lib/status'
import { useVellor } from '@/lib/store'
import type { Computer, PreventiveHealth } from '@/lib/types'

/** Máximo de equipamentos destacados no cartão. */
const ATTENTION_LIMIT = 6

/** Pesos da fila de urgência: preventiva vencida pesa mais que telemetria crítica. */
const SCORE_OVERDUE = 100
const SCORE_CRITICAL = 60
const SCORE_UPCOMING = 20

interface AttentionItem {
  computer: Computer
  health: PreventiveHealth
  sectorName: string
  reason: string | null
  score: number
}

/** Dias corridos de atraso da próxima preventiva; `0` quando ainda não venceu. */
function overdueDaysOf(computer: Computer): number {
  const remaining = daysUntil(computer.nextMaintenanceAt)
  if (remaining === null || remaining >= 0) return 0
  return Math.abs(remaining)
}

/** Cartão com os equipamentos mais urgentes do parque. */
function AttentionList() {
  const vellor = useVellor()
  const { getSectorName } = vellor

  const items = useMemo<AttentionItem[]>(() => {
    const scored = vellor.db.computers.map<AttentionItem>((computer) => {
      const health = preventiveHealthOf(computer)
      const critical = computerIsCritical(computer)

      let score = 0
      if (health === 'ATRASADA') score += SCORE_OVERDUE + overdueDaysOf(computer)
      if (health === 'PROXIMA') score += SCORE_UPCOMING
      if (critical) score += SCORE_CRITICAL

      return {
        computer,
        health,
        sectorName: getSectorName(computer.assignment.sectorId),
        reason: critical ? (criticalReasons(computer)[0] ?? null) : null,
        score,
      }
    })

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, ATTENTION_LIMIT)
  }, [vellor.db.computers, getSectorName])

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base">Precisam de atenção</CardTitle>
        <CardDescription>Equipamentos com preventiva vencida ou saúde crítica</CardDescription>
      </CardHeader>

      <CardContent className="px-0">
        {items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum equipamento em alerta."
            description="Todo o parque está com a preventiva em dia e a telemetria dentro da faixa."
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.computer.id}>
                <Link
                  href={`/inventario/${item.computer.id}`}
                  className="focus-ring flex flex-col gap-1 px-6 py-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.computer.assetTag} · {item.computer.hostname}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{item.sectorName}</p>
                    </div>

                    <PreventiveHealthBadge health={item.health} className="shrink-0" />
                  </div>

                  {item.reason ? (
                    <p className="line-clamp-2 text-xs text-danger">{item.reason}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CardFooter className="border-t border-border">
        <Link
          href="/saude"
          className="focus-ring inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary transition-colors hover:text-primary-hover"
        >
          Ver todos os equipamentos críticos
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  )
}

export { AttentionList }
