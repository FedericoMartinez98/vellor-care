'use client'

/**
 * Painel Operacional de Manutenções Preventivas:
 * - Semáforo operacional por computador (Em dia, Próxima, Atrasada)
 * - Fila de ordens de serviço pendentes
 * - Início rápido de checklist
 * - Reagendamento e histórico
 */

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  PlayCircle,
  Plus,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

import { MaintenanceDetailDialog } from '@/components/inventario/maintenance-detail-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { PreventiveExecutionDialog } from '@/components/preventivas/preventive-execution-dialog'
import { RescheduleDialog } from '@/components/preventivas/reschedule-dialog'
import {
  DataTable,
  DataTableColumnHeader,
  MaintenanceStatusBadge,
  PreventiveHealthBadge,
  SectorBadge,
  StatCard,
} from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatRelative } from '@/lib/format'
import { effectiveMaintenanceStatus, preventiveHealthOf } from '@/lib/status'
import { useVellor } from '@/lib/store'
import type { Computer, Maintenance } from '@/lib/types'

export function PreventivesView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    ready,
    computers,
    sectors,
    maintenances,
    getComputer,
  } = useVellor()

  const [executionOpen, setExecutionOpen] = React.useState(false)
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)

  const [selectedMaintenance, setSelectedMaintenance] = React.useState<Maintenance | undefined>()
  const [selectedComputer, setSelectedComputer] = React.useState<Computer | undefined>()

  // Abre dialog a partir de ?nova=1&computerId=...
  React.useEffect(() => {
    if (!ready) return
    const nova = searchParams.get('nova')
    const computerId = searchParams.get('computerId')

    if (nova === '1') {
      if (computerId) {
        const found = getComputer(computerId)
        if (found) setSelectedComputer(found)
      }
      setExecutionOpen(true)
    }
  }, [ready, searchParams, getComputer])

  // Estatísticas do topo
  const stats = React.useMemo(() => {
    const onSchedule = computers.filter((c) => preventiveHealthOf(c) === 'EM_DIA').length
    const warning = computers.filter((c) => preventiveHealthOf(c) === 'PROXIMA').length
    const overdue = computers.filter((c) => preventiveHealthOf(c) === 'ATRASADA').length
    const inProgress = maintenances.filter((m) => m.status === 'EM_ANDAMENTO').length
    const scheduled = maintenances.filter((m) => m.status === 'AGENDADA').length

    return { onSchedule, warning, overdue, inProgress, scheduled, total: computers.length }
  }, [computers, maintenances])

  // Lista de computadores para o semáforo
  const computersData = React.useMemo(() => {
    return [...computers].sort((a, b) => {
      const healthOrder = { ATRASADA: 0, PROXIMA: 1, EM_DIA: 2 }
      const aH = healthOrder[preventiveHealthOf(a)]
      const bH = healthOrder[preventiveHealthOf(b)]
      if (aH !== bH) return aH - bH
      return (a.nextMaintenanceAt ?? '').localeCompare(b.nextMaintenanceAt ?? '')
    })
  }, [computers])

  // Ordens de serviço abertas
  const openMaintenances = React.useMemo(() => {
    return maintenances.filter(
      (m) => m.type === 'PREVENTIVA' && (m.status === 'AGENDADA' || m.status === 'EM_ANDAMENTO' || m.status === 'ATRASADA'),
    )
  }, [maintenances])

  // Colunas da Fila por Equipamento (Semáforo)
  const computerColumns = React.useMemo<ColumnDef<Computer>[]>(() => {
    return [
      {
        accessorKey: 'assetTag',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Patrimônio" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold tabular text-foreground">{row.original.assetTag}</span>
            <span className="text-xs text-muted-foreground">{row.original.hostname}</span>
          </div>
        ),
      },
      {
        id: 'employeeName',
        accessorFn: (row) => row.assignment.employeeName,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Responsável" />,
        cell: ({ row }) => (
          <div className="flex flex-col text-sm">
            <span className="font-medium">{row.original.assignment.employeeName}</span>
            <span className="text-xs text-muted-foreground">{row.original.assignment.location || row.original.assignment.unit}</span>
          </div>
        ),
      },
      {
        id: 'sectorId',
        accessorFn: (row) => row.assignment.sectorId,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Setor" />,
        cell: ({ row }) => {
          const sector = sectors.find((s) => s.id === row.original.assignment.sectorId)
          return <SectorBadge sector={sector} />
        },
      },
      {
        id: 'health',
        accessorFn: (row) => preventiveHealthOf(row),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Situação" />,
        cell: ({ row }) => {
          const health = preventiveHealthOf(row.original)
          return <PreventiveHealthBadge health={health} />
        },
      },
      {
        accessorKey: 'lastMaintenanceAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Última Realizada" />,
        cell: ({ row }) => {
          const dt = row.original.lastMaintenanceAt
          if (!dt) return <span className="text-xs text-muted-foreground">Nunca</span>
          return (
            <div className="flex flex-col text-xs">
              <span className="tabular font-medium">{formatDate(dt)}</span>
              <span className="text-muted-foreground">{formatRelative(dt)}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'nextMaintenanceAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimento Prev." />,
        cell: ({ row }) => {
          const dt = row.original.nextMaintenanceAt
          if (!dt) return <span className="text-xs text-muted-foreground">—</span>
          return (
            <div className="flex flex-col text-xs">
              <span className="tabular font-medium">{formatDate(dt)}</span>
              <span className="text-muted-foreground">{formatRelative(dt)}</span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const comp = row.original
          return (
            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setSelectedComputer(comp)
                  setSelectedMaintenance(undefined)
                  setExecutionOpen(true)
                }}
              >
                <Wrench className="mr-1 size-3.5" />
                Executar
              </Button>
            </div>
          )
        },
      },
    ]
  }, [sectors])

  // Colunas de Ordens de Serviço
  const osColumns = React.useMemo<ColumnDef<Maintenance>[]>(() => {
    return [
      {
        accessorKey: 'assetTag',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Equipamento" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold tabular text-foreground">{row.original.assetTag}</span>
            <span className="text-xs text-muted-foreground">{row.original.hostname}</span>
          </div>
        ),
      },
      {
        accessorKey: 'technicianName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Técnico" />,
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.technicianName}</span>
        ),
      },
      {
        id: 'status',
        accessorFn: (row) => effectiveMaintenanceStatus(row),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status da OS" />,
        cell: ({ row }) => {
          const status = effectiveMaintenanceStatus(row.original)
          return <MaintenanceStatusBadge status={status} />
        },
      },
      {
        accessorKey: 'scheduledFor',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Agendado Para" />,
        cell: ({ row }) => (
          <span className="tabular text-xs font-medium">{formatDate(row.original.scheduledFor)}</span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const maint = row.original
          return (
            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedMaintenance(maint)
                  setRescheduleOpen(true)
                }}
              >
                <CalendarClock className="mr-1 size-3.5" />
                Reagendar
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setSelectedMaintenance(maint)
                  const comp = getComputer(maint.computerId)
                  if (comp) setSelectedComputer(comp)
                  setExecutionOpen(true)
                }}
              >
                <PlayCircle className="mr-1 size-3.5" />
                Iniciar
              </Button>
            </div>
          )
        },
      },
    ]
  }, [getComputer])

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Manutenções Preventivas"
        description="Painel de controle do ciclo de 90 dias, semáforo operacional e execução de checklists."
        actions={
          <Button
            onClick={() => {
              setSelectedMaintenance(undefined)
              setSelectedComputer(undefined)
              setExecutionOpen(true)
            }}
          >
            <Plus className="mr-2 size-4" />
            Nova Manutenção
          </Button>
        }
      />

      {/* Grid de Semáforo / Estatísticas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Preventivas em Dia"
          value={stats.onSchedule}
          icon={ShieldCheck}
          tone="success"
          hint={`${Math.round((stats.onSchedule / (stats.total || 1)) * 100)}% da base`}
        />
        <StatCard
          label="Vencendo em 7 Dias"
          value={stats.warning}
          icon={Clock}
          tone={stats.warning > 0 ? 'warning' : 'default'}
          hint="Agendamento prioritário"
        />
        <StatCard
          label="Preventivas Atrasadas"
          value={stats.overdue}
          icon={AlertTriangle}
          tone={stats.overdue > 0 ? 'danger' : 'default'}
          hint="Ação imediata necessária"
        />
        <StatCard
          label="Em Andamento / Bancada"
          value={stats.inProgress}
          icon={Wrench}
          tone="info"
          hint="Sendo executadas agora"
        />
      </div>

      {/* Abas: Semáforo por Computador vs Ordens de Serviço */}
      <Tabs defaultValue="semaforo" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-80">
          <TabsTrigger value="semaforo">Fila de Equipamentos</TabsTrigger>
          <TabsTrigger value="ordens">
            Ordens de Serviço ({openMaintenances.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="semaforo" className="m-0 focus-visible:outline-none">
            <DataTable<Computer, unknown>
              columns={computerColumns}
              data={computersData}
              searchPlaceholder="Buscar por patrimônio, responsável..."
              onRowClick={(row: Computer) => router.push(`/inventario/${row.id}`)}
            />
          </TabsContent>

          <TabsContent value="ordens" className="m-0 focus-visible:outline-none">
            <DataTable<Maintenance, unknown>
              columns={osColumns}
              data={openMaintenances}
              searchPlaceholder="Buscar ordem por patrimônio..."
              onRowClick={(row: Maintenance) => {
                setSelectedMaintenance(row)
                setDetailOpen(true)
              }}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialog de Execução */}
      <PreventiveExecutionDialog
        open={executionOpen}
        onOpenChange={(open) => {
          setExecutionOpen(open)
          if (!open) router.replace('/preventivas')
        }}
        maintenance={selectedMaintenance}
        computer={selectedComputer}
      />

      {/* Dialog de Reagendamento */}
      {selectedMaintenance ? (
        <RescheduleDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          maintenance={selectedMaintenance}
        />
      ) : null}

      {/* Dialog de Detalhes */}
      <MaintenanceDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        maintenance={selectedMaintenance}
      />
    </div>
  )
}
