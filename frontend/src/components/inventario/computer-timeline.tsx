'use client'

/**
 * Aba "Histórico": linha do tempo das manutenções do equipamento, com filtro
 * por tipo de serviço e resumo de esforço/custo.
 */

import * as React from 'react'
import {
  Ban,
  CalendarClock,
  History,
  PlayCircle,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { MaintenanceDetailDialog } from '@/components/inventario/maintenance-detail-dialog'
import { MaintenanceStatusBadge, SectionCard, Timeline } from '@/components/shared'
import type { TimelineItem, TimelineTone } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MAINTENANCE_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency, formatDuration, formatNumber } from '@/lib/format'
import { useVellor } from '@/lib/store'
import { checklistCompletion, effectiveMaintenanceStatus } from '@/lib/status'
import { MAINTENANCE_TYPE, type Maintenance, type MaintenanceStatus } from '@/lib/types'

export interface ComputerTimelineProps {
  computerId: string
}

const ALL_TYPES = 'TODOS'

const STATUS_TONE: Record<MaintenanceStatus, TimelineTone> = {
  CONCLUIDA: 'success',
  EM_ANDAMENTO: 'info',
  AGENDADA: 'warning',
  ATRASADA: 'danger',
  CANCELADA: 'default',
}

const STATUS_ICON: Record<MaintenanceStatus, LucideIcon> = {
  CONCLUIDA: Wrench,
  EM_ANDAMENTO: PlayCircle,
  AGENDADA: CalendarClock,
  ATRASADA: TriangleAlert,
  CANCELADA: Ban,
}

function maintenanceDate(maintenance: Maintenance): string {
  return maintenance.finishedAt ?? maintenance.startedAt ?? maintenance.scheduledFor
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular">{value}</p>
    </div>
  )
}

function ComputerTimeline({ computerId }: ComputerTimelineProps) {
  const vellor = useVellor()

  const [typeFilter, setTypeFilter] = React.useState<string>(ALL_TYPES)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const maintenances = vellor.maintenancesOfComputer(computerId)

  const filtered = React.useMemo(
    () =>
      typeFilter === ALL_TYPES
        ? maintenances
        : maintenances.filter((maintenance) => maintenance.type === typeFilter),
    [maintenances, typeFilter],
  )

  const summary = React.useMemo(() => {
    const withDuration = filtered.filter(
      (maintenance) => typeof maintenance.durationMinutes === 'number',
    )
    const totalMinutes = withDuration.reduce(
      (total, maintenance) => total + (maintenance.durationMinutes ?? 0),
      0,
    )
    const partsCost = filtered.reduce(
      (total, maintenance) =>
        total +
        maintenance.parts.reduce(
          (subtotal, part) => subtotal + part.quantity * (part.unitCost ?? 0),
          0,
        ),
      0,
    )

    return {
      total: filtered.length,
      averageMinutes: withDuration.length > 0 ? totalMinutes / withDuration.length : null,
      partsCost,
    }
  }, [filtered])

  const selected = selectedId
    ? filtered.find((maintenance) => maintenance.id === selectedId)
    : undefined

  function openDetails(id: string) {
    setSelectedId(id)
    setDialogOpen(true)
  }

  const items: TimelineItem[] = filtered.map((maintenance) => {
    const status = effectiveMaintenanceStatus(maintenance)
    const completion = checklistCompletion(maintenance.checklist)
    const partsCost = maintenance.parts.reduce(
      (total, part) => total + part.quantity * (part.unitCost ?? 0),
      0,
    )

    return {
      id: maintenance.id,
      title: `${MAINTENANCE_TYPE_LABELS[maintenance.type]} — ${maintenance.technicianName}`,
      date: maintenanceDate(maintenance),
      tone: STATUS_TONE[status],
      icon: STATUS_ICON[status],
      description: (
        <div className="flex flex-wrap items-center gap-2">
          <MaintenanceStatusBadge status={status} />
          {maintenance.durationMinutes === undefined ? null : (
            <span className="text-xs tabular">
              {formatDuration(maintenance.durationMinutes)}
            </span>
          )}
          {partsCost > 0 ? (
            <span className="text-xs tabular">{formatCurrency(partsCost)} em peças</span>
          ) : null}
        </div>
      ),
      content: (
        <div className="flex flex-col gap-3">
          {completion.total > 0 ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Checklist</span>
                <span className="tabular">
                  {completion.done} de {completion.total} itens
                </span>
              </div>
              <Progress
                value={completion.percent}
                indicatorClassName={completion.percent === 100 ? 'bg-success' : 'bg-primary'}
                aria-label="Percentual do checklist concluído"
              />
            </div>
          ) : null}

          {maintenance.parts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {maintenance.parts.map((part) => (
                <Badge key={part.partId} variant="outline">
                  {part.partName} × {formatNumber(part.quantity)}
                </Badge>
              ))}
            </div>
          ) : null}

          {maintenance.notes ? (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {maintenance.notes}
            </p>
          ) : null}

          {maintenance.photos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {maintenance.photos.map((photo) => (
                // Miniaturas em data-URL geradas pelo próprio aparelho do técnico.
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={photo.caption ?? 'Foto da manutenção'}
                  className="size-16 rounded-md border border-border object-cover"
                />
              ))}
            </div>
          ) : null}

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openDetails(maintenance.id)}
            >
              Ver detalhes
            </Button>
          </div>
        </div>
      ),
    }
  })

  return (
    <>
      <SectionCard
        title="Linha do tempo"
        icon={History}
        description="Todos os atendimentos registrados para este equipamento."
        action={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger size="sm" className="w-40 sm:w-48" aria-label="Filtrar por tipo">
              <SelectValue placeholder="Tipo de serviço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>Todos os tipos</SelectItem>
              {MAINTENANCE_TYPE.map((type) => (
                <SelectItem key={type} value={type}>
                  {MAINTENANCE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="Manutenções" value={formatNumber(summary.total)} />
            <Metric
              label="Tempo médio"
              value={summary.averageMinutes === null ? '—' : formatDuration(summary.averageMinutes)}
            />
            <Metric label="Gasto em peças" value={formatCurrency(summary.partsCost)} />
          </div>

          <Timeline
            items={items}
            emptyLabel={
              typeFilter === ALL_TYPES
                ? 'Nenhuma manutenção registrada para este equipamento.'
                : 'Nenhuma manutenção deste tipo para o equipamento.'
            }
          />
        </div>
      </SectionCard>

      <MaintenanceDetailDialog
        maintenance={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}

export { ComputerTimeline }
