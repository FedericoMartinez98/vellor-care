'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Plus, ShieldCheck } from 'lucide-react'

import { ChartFrame } from '@/components/charts/chart-frame'
import { VellorBarChart, type BarSeries } from '@/components/charts/bar-chart'
import { VellorDonutChart, type DonutDatum } from '@/components/charts/donut-chart'
import { VellorAreaChart, type LineSeries } from '@/components/charts/line-area-chart'
import { AttentionList } from '@/components/dashboard/attention-list'
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'
import { MetricGrid } from '@/components/dashboard/metric-grid'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isRemoteBackend } from '@/lib/api'
import { formatDuration, formatNumber, formatPercent } from '@/lib/format'
import { useRealDatabase } from '@/lib/hooks/use-real-database'
import { preventiveHealthOf } from '@/lib/status'
import {
  buildDashboardMetrics,
  buildDurationSeries,
  buildMonthlySeries,
  buildSectorSeries,
  buildStatusSeries,
  useVellor,
} from '@/lib/store'
import { cn } from '@/lib/utils'

// ============================================================================
// Período dos gráficos
// ============================================================================

type PeriodValue = '6' | '12'

const PERIOD_OPTIONS: { value: PeriodValue; label: string }[] = [
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
]

/** Estreita a string devolvida pelo Radix para o união literal do período. */
function isPeriodValue(value: string): value is PeriodValue {
  return value === '6' || value === '12'
}

// ============================================================================
// Séries dos gráficos
// ============================================================================

const MONTHLY_SERIES: BarSeries[] = [
  { key: 'concluidas', label: 'Concluídas', color: 'var(--chart-3)' },
  { key: 'agendadas', label: 'Agendadas', color: 'var(--chart-1)' },
  { key: 'atrasadas', label: 'Atrasadas', color: 'var(--chart-6)' },
]

const SECTOR_SERIES: BarSeries[] = [
  { key: 'emDia', label: 'Em dia', color: 'var(--success)', stackId: 'preventiva' },
  { key: 'pendentes', label: 'Próximas', color: 'var(--warning)', stackId: 'preventiva' },
  { key: 'atrasadas', label: 'Atrasadas', color: 'var(--danger)', stackId: 'preventiva' },
]

const DURATION_SERIES: LineSeries[] = [
  { key: 'minutos', label: 'Tempo médio', color: 'var(--chart-2)' },
]

// ============================================================================
// Conformidade
// ============================================================================

type ComplianceTone = 'success' | 'warning' | 'danger'

/** Classes escritas por extenso — o Tailwind não enxerga classe montada em runtime. */
const COMPLIANCE_STYLES: Record<
  ComplianceTone,
  { indicator: string; iconBg: string; iconFg: string; value: string }
> = {
  success: {
    indicator: 'bg-success',
    iconBg: 'bg-success-soft',
    iconFg: 'text-success',
    value: 'text-success',
  },
  warning: {
    indicator: 'bg-warning',
    iconBg: 'bg-warning-soft',
    iconFg: 'text-warning',
    value: 'text-warning',
  },
  danger: {
    indicator: 'bg-danger',
    iconBg: 'bg-danger-soft',
    iconFg: 'text-danger',
    value: 'text-danger',
  },
}

/** Verde a partir de 85%, amarelo a partir de 60%, vermelho abaixo disso. */
function complianceToneOf(rate: number): ComplianceTone {
  if (rate >= 85) return 'success'
  if (rate >= 60) return 'warning'
  return 'danger'
}

// ============================================================================
// Tela
// ============================================================================

function DashboardView() {
  const vellor = useVellor()
  const real = useRealDatabase()
  const remote = isRemoteBackend()
  const router = useRouter()
  const [period, setPeriod] = useState<PeriodValue>('6')

  const months = period === '6' ? 6 : 12
  // Os selectors abaixo são os mesmos nos dois modos -- só a origem do `db` muda.
  const db = remote ? real.db : vellor.db
  const ready = remote ? real.ready : vellor.ready

  const metrics = useMemo(() => buildDashboardMetrics(db), [db])
  const monthlySeries = useMemo(() => buildMonthlySeries(db, months), [db, months])
  const durationSeries = useMemo(() => buildDurationSeries(db, months), [db, months])
  const sectorSeries = useMemo(() => buildSectorSeries(db), [db])
  const statusSeries = useMemo(() => buildStatusSeries(db), [db])

  const donutData = useMemo<DonutDatum[]>(
    () => statusSeries.map((point) => ({ label: point.label, value: point.value, color: point.color })),
    [statusSeries],
  )

  const totalMaintenances = useMemo(
    () => statusSeries.reduce((sum, point) => sum + point.value, 0),
    [statusSeries],
  )

  /** Conformidade contada sobre o parque ativo: desativados não exigem preventiva. */
  const compliance = useMemo(() => {
    const considered = db.computers.filter((computer) => computer.status !== 'DESATIVADO')
    const onSchedule = considered.filter(
      (computer) => preventiveHealthOf(computer) === 'EM_DIA',
    ).length
    return { onSchedule, total: considered.length }
  }, [db])

  const handlePeriodChange = useCallback((value: string) => {
    if (isPeriodValue(value)) setPeriod(value)
  }, [])

  const goToNewPreventive = useCallback(() => {
    router.push('/preventivas?nova=1')
  }, [router])

  const complianceTone = complianceToneOf(metrics.complianceRate)
  const complianceStyles = COMPLIANCE_STYLES[complianceTone]

  const monthlyIsEmpty = monthlySeries.every(
    (point) => point.agendadas + point.concluidas + point.atrasadas === 0,
  )
  const durationIsEmpty = durationSeries.every((point) => point.minutos === 0)

  const actions = (
    <>
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Período dos gráficos">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" onClick={goToNewPreventive}>
        <Plus aria-hidden="true" />
        Nova preventiva
      </Button>
    </>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral do parque de computadores e das manutenções preventivas."
        icon={LayoutDashboard}
        actions={actions}
      />

      {!ready ? (
        <DashboardSkeleton />
      ) : (
        <div className="animate-in-up space-y-6">
          <MetricGrid metrics={metrics} statusCount={metrics.computersByStatus} />

          {/* Faixa de conformidade */}
          <Card className="gap-0 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-4 sm:w-72 sm:shrink-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl',
                    complianceStyles.iconBg,
                  )}
                >
                  <ShieldCheck className={cn('size-5', complianceStyles.iconFg)} />
                </span>

                <div className="min-w-0">
                  <h2 className="text-sm font-medium">Conformidade da preventiva</h2>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(compliance.onSchedule)} de {formatNumber(compliance.total)}{' '}
                    computadores com preventiva em dia
                  </p>
                </div>
              </div>

              <div className="flex flex-1 items-center gap-4">
                <Progress
                  value={metrics.complianceRate}
                  indicatorClassName={complianceStyles.indicator}
                  className="h-2.5 flex-1"
                  aria-label="Percentual de conformidade da preventiva"
                />
                <span
                  className={cn(
                    'tabular shrink-0 text-3xl font-semibold tracking-tight',
                    complianceStyles.value,
                  )}
                >
                  {formatPercent(metrics.complianceRate)}
                </span>
              </div>
            </div>
          </Card>

          {/* Volume mensal e distribuição por status */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartFrame
              title="Preventivas realizadas por mês"
              description="Agendadas x concluídas x atrasadas"
              className="lg:col-span-2"
              height={300}
              empty={monthlyIsEmpty}
              emptyLabel="Nenhuma manutenção no período."
            >
              <VellorBarChart
                data={monthlySeries}
                xKey="month"
                series={MONTHLY_SERIES}
                valueFormatter={(value) => formatNumber(value)}
              />
            </ChartFrame>

            <ChartFrame
              title="Status das preventivas"
              description="Distribuição por situação atual"
              raw
              empty={donutData.length === 0}
              emptyLabel="Nenhuma manutenção registrada."
            >
              <VellorDonutChart
                data={donutData}
                height={230}
                legendPosition="below"
                centerValue={formatNumber(totalMaintenances)}
                centerLabel="manutenções"
                valueFormatter={(value) => formatNumber(value)}
              />
            </ChartFrame>
          </div>

          {/* Setores e tempo médio */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartFrame
              title="Equipamentos por setor"
              description="Distribuição e conformidade"
              height={360}
              empty={sectorSeries.length === 0}
              emptyLabel="Nenhum setor cadastrado."
            >
              <VellorBarChart
                data={sectorSeries}
                xKey="sector"
                series={SECTOR_SERIES}
                layout="horizontal"
                categoryAxisWidth={108}
                valueFormatter={(value) => formatNumber(value)}
              />
            </ChartFrame>

            <ChartFrame
              title="Tempo médio de manutenção"
              description="Minutos por atendimento"
              height={360}
              empty={durationIsEmpty}
              emptyLabel="Nenhuma manutenção concluída no período."
            >
              <VellorAreaChart
                data={durationSeries}
                xKey="month"
                series={DURATION_SERIES}
                valueFormatter={(value) => formatDuration(value)}
              />
            </ChartFrame>
          </div>

          {/* Feed e fila de urgência */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <RecentActivity />
            </div>
            <div className="lg:col-span-2">
              <AttentionList />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { DashboardView }
