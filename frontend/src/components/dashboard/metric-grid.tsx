'use client'

import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  MonitorSmartphone,
  ShieldAlert,
} from 'lucide-react'

import { StatCard } from '@/components/shared/stat-card'
import { formatDuration, formatNumber } from '@/lib/format'
import type { ComputerStatus, DashboardMetrics } from '@/lib/types'

export interface MetricGridProps {
  metrics: DashboardMetrics
  /** Quebra do parque por situação do equipamento (`metrics.computersByStatus`). */
  statusCount: Record<ComputerStatus, number>
}

/** Faixa de 5 indicadores do topo do dashboard. */
function MetricGrid({ metrics, statusCount }: MetricGridProps) {
  const averageLabel =
    metrics.averageMaintenanceMinutes > 0
      ? `Tempo médio de ${formatDuration(metrics.averageMaintenanceMinutes)}`
      : 'Sem tempo médio apurado'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Computadores cadastrados"
        value={formatNumber(metrics.totalComputers)}
        icon={MonitorSmartphone}
        tone="default"
        hint={`${formatNumber(statusCount.ATIVO)} ativos · ${formatNumber(statusCount.EM_MANUTENCAO)} em manutenção`}
        href="/inventario"
      />

      <StatCard
        label="Preventivas do mês"
        value={formatNumber(metrics.preventivesThisMonth)}
        icon={CalendarCheck}
        tone="info"
        hint={`${formatNumber(metrics.preventivesThisMonthDone)} concluídas`}
        href="/preventivas"
      />

      <StatCard
        label="Preventivas atrasadas"
        value={formatNumber(metrics.overduePreventives)}
        icon={AlertTriangle}
        tone="danger"
        hint="Exigem ação imediata"
        href="/preventivas?status=ATRASADA"
      />

      <StatCard
        label="Concluídas hoje"
        value={formatNumber(metrics.completedToday)}
        icon={CheckCircle2}
        tone="success"
        hint={averageLabel}
      />

      <StatCard
        label="Equipamentos críticos"
        value={formatNumber(metrics.criticalComputers)}
        icon={ShieldAlert}
        tone="warning"
        hint="Saúde ou temperatura fora da faixa"
        href="/saude"
      />
    </div>
  )
}

export { MetricGrid }
