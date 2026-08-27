'use client'

/**
 * Visão do Histórico de Atendimentos:
 * - Log completo de todas as ordens de serviço executadas
 * - Filtros por período, técnico, setor, equipamento e status
 * - Exportação de dados em PDF, Excel e CSV
 * - Detalhamento completo com checklist assinado e fotos
 */

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'

import { MaintenanceDetailDialog } from '@/components/inventario/maintenance-detail-dialog'
import { PageHeader } from '@/components/layout/page-header'
import {
  DataTable,
  DataTableColumnHeader,
  MaintenanceStatusBadge,
  SectorBadge,
  StatCard,
  type DataTableFacet,
} from '@/components/shared'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/constants'
import {
  exportMaintenancesCsv,
  exportMaintenancesPdf,
  exportMaintenancesXlsx,
} from '@/lib/export'
import { isRemoteBackend } from '@/lib/api'
import { formatDate, formatDuration } from '@/lib/format'
import { useRealInventory } from '@/lib/hooks/use-real-inventory'
import { useRealMaintenances } from '@/lib/hooks/use-real-maintenances'
import { effectiveMaintenanceStatus } from '@/lib/status'
import { useVellor } from '@/lib/store'
import {
  MAINTENANCE_STATUS,
  MAINTENANCE_TYPE,
  type Maintenance,
} from '@/lib/types'

export function HistoryView() {
  const mock = useVellor()
  const realMaintenances = useRealMaintenances()
  const realInventory = useRealInventory()
  const remote = isRemoteBackend()

  const ready = remote ? realMaintenances.ready && realInventory.ready : mock.ready
  const maintenances = remote ? realMaintenances.maintenances : mock.maintenances
  const sectors = remote ? realInventory.sectors : mock.sectors
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = React.useState<Maintenance | undefined>()

  // Estatísticas do histórico
  const stats = React.useMemo(() => {
    const total = maintenances.length
    const completed = maintenances.filter((m) => m.status === 'CONCLUIDA').length
    const withDuration = maintenances.filter((m) => typeof m.durationMinutes === 'number')
    const avgDuration =
      withDuration.length > 0
        ? Math.round(
            withDuration.reduce((acc, m) => acc + (m.durationMinutes ?? 0), 0) /
              withDuration.length,
          )
        : 0
    const partsCount = maintenances.reduce(
      (acc, m) => acc + m.parts.reduce((sum, p) => sum + p.quantity, 0),
      0,
    )

    return { total, completed, avgDuration, partsCount }
  }, [maintenances])

  const facets = React.useMemo<DataTableFacet[]>(() => {
    return [
      {
        columnId: 'type',
        title: 'Tipo de Serviço',
        options: MAINTENANCE_TYPE.map((t) => ({
          label: MAINTENANCE_TYPE_LABELS[t],
          value: t,
        })),
      },
      {
        columnId: 'status',
        title: 'Status',
        options: MAINTENANCE_STATUS.map((st) => ({
          label: MAINTENANCE_STATUS_LABELS[st],
          value: st,
        })),
      },
      {
        columnId: 'sectorId',
        title: 'Setor',
        options: sectors.map((s) => ({ label: s.name, value: s.id })),
      },
    ]
  }, [sectors])

  const columns = React.useMemo<ColumnDef<Maintenance>[]>(() => {
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
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">
            {MAINTENANCE_TYPE_LABELS[row.original.type]}
          </span>
        ),
      },
      {
        id: 'sectorId',
        accessorFn: (row) => row.sectorId,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Setor" />,
        cell: ({ row }) => {
          const sector = sectors.find((s) => s.id === row.original.sectorId)
          return <SectorBadge sector={sector} />
        },
      },
      {
        accessorKey: 'technicianName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Técnico" />,
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">
            {row.original.technicianName}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (row) => effectiveMaintenanceStatus(row),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const status = effectiveMaintenanceStatus(row.original)
          return <MaintenanceStatusBadge status={status} />
        },
      },
      {
        accessorKey: 'scheduledFor',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Data de Execução" />,
        cell: ({ row }) => {
          const dt = row.original.finishedAt ?? row.original.scheduledFor
          return <span className="tabular text-xs text-muted-foreground">{formatDate(dt)}</span>
        },
      },
      {
        accessorKey: 'durationMinutes',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Duração" />,
        cell: ({ row }) => {
          const min = row.original.durationMinutes
          if (min === undefined) return <span className="text-xs text-muted-foreground">—</span>
          return <span className="tabular text-xs font-medium">{formatDuration(min)}</span>
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const maint = row.original
          return (
            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedMaintenance(maint)
                  setDetailOpen(true)
                }}
              >
                <Eye className="mr-1 size-3.5" />
                Ver Ficha
              </Button>
            </div>
          )
        },
      },
    ]
  }, [sectors])

  function handleExport(format: 'pdf' | 'xlsx' | 'csv') {
    try {
      if (format === 'pdf') {
        exportMaintenancesPdf(maintenances)
      } else if (format === 'xlsx') {
        exportMaintenancesXlsx(maintenances)
      } else {
        exportMaintenancesCsv(maintenances)
      }
      toast.success(`Histórico exportado em ${format.toUpperCase()} com sucesso.`)
    } catch {
      toast.error('Erro ao exportar o histórico.')
    }
  }

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
        title="Histórico de Atendimentos"
        description="Base de dados de manutenções realizadas, substituição de peças e checklists técnicos."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 size-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                Exportar em PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Exportar em Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Exportar em CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Estatísticas Rápidas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de Registros"
          value={stats.total}
          icon={History}
          hint="Histórico geral acumulado"
        />
        <StatCard
          label="Manutenções Concluídas"
          value={stats.completed}
          icon={CheckCircle2}
          tone="success"
          hint="Ordens finalizadas com sucesso"
        />
        <StatCard
          label="Tempo Médio por Ordem"
          value={formatDuration(stats.avgDuration)}
          icon={Clock}
          tone="info"
          hint="Tempo médio de bancada"
        />
        <StatCard
          label="Peças Consumidas"
          value={stats.partsCount}
          icon={Wrench}
          tone="warning"
          hint="Itens baixados do estoque"
        />
      </div>

      {/* Tabela TanStack */}
      <DataTable<Maintenance, unknown>
        columns={columns}
        data={maintenances}
        searchPlaceholder="Buscar por patrimônio, técnico ou notas..."
        onRowClick={(row: Maintenance) => {
          setSelectedMaintenance(row)
          setDetailOpen(true)
        }}
        facets={facets}
      />

      {/* Dialog de Detalhes */}
      <MaintenanceDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        maintenance={selectedMaintenance}
      />
    </div>
  )
}
