'use client'

/**
 * Visão principal do módulo de inventário: estatísticas de topo,
 * tabela com filtros facetados, busca global, ordenação e ações de CRUD.
 */

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  Laptop,
  Monitor,
  MonitorSmartphone,
  Plus,
  UploadCloud,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'

import { ComputerFormDialog } from '@/components/inventario/computer-form-dialog'
import { ComputerRowActions } from '@/components/inventario/computer-row-actions'
import { PageHeader } from '@/components/layout/page-header'
import {
  ComputerStatusBadge,
  DataTable,
  DataTableColumnHeader,
  PreventiveHealthBadge,
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
  COMPUTER_STATUS_LABELS,
  PREVENTIVE_HEALTH_LABELS,
} from '@/lib/constants'
import { isRemoteBackend } from '@/lib/api'
import { exportComputersCsv, exportComputersPdf, exportComputersXlsx } from '@/lib/export'
import { formatDate, formatRelative } from '@/lib/format'
import { useRealInventory } from '@/lib/hooks/use-real-inventory'
import { computerIsCritical, preventiveHealthOf } from '@/lib/status'
import { useVellor } from '@/lib/store'
import { COMPUTER_STATUS, PREVENTIVE_HEALTH, type Computer } from '@/lib/types'

export function InventoryView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mock = useVellor()
  const real = useRealInventory()
  const remote = isRemoteBackend()

  const ready = remote ? real.ready : mock.ready
  const computers = remote ? real.computers : mock.computers
  const sectors = remote ? real.sectors : mock.sectors
  const deleteComputer = remote
    ? (id: string) => { void real.removeComputer(id) }
    : mock.deleteComputer

  const [formOpen, setFormOpen] = React.useState(false)
  const [editingComputer, setEditingComputer] = React.useState<Computer | undefined>()

  React.useEffect(() => {
    if (remote && real.error) toast.error(real.error)
  }, [remote, real.error])

  // Abre dialog via query param ?novo=1 ou ?editar=ID
  React.useEffect(() => {
    if (!ready) return
    const novo = searchParams.get('novo')
    const editarId = searchParams.get('editar')

    if (novo === '1') {
      setEditingComputer(undefined)
      setFormOpen(true)
    } else if (editarId) {
      const found = computers.find((c) => c.id === editarId)
      if (found) {
        setEditingComputer(found)
        setFormOpen(true)
      }
    }
  }, [ready, searchParams, computers])

  const stats = React.useMemo(() => {
    const total = computers.length
    const active = computers.filter((c) => c.status === 'ATIVO').length
    const inMaintenance = computers.filter((c) => c.status === 'EM_MANUTENCAO').length
    const overdue = computers.filter((c) => preventiveHealthOf(c) === 'ATRASADA').length
    const critical = computers.filter((c) => computerIsCritical(c)).length

    return { total, active, inMaintenance, overdue, critical }
  }, [computers])

  const facets = React.useMemo<DataTableFacet[]>(() => {
    return [
      {
        columnId: 'sectorId',
        title: 'Setor',
        options: sectors.map((s) => ({ label: s.name, value: s.id })),
      },
      {
        columnId: 'status',
        title: 'Status',
        options: COMPUTER_STATUS.map((st) => ({
          label: COMPUTER_STATUS_LABELS[st],
          value: st,
        })),
      },
      {
        columnId: 'preventiveHealth',
        title: 'Preventiva',
        options: PREVENTIVE_HEALTH.map((h) => ({
          label: PREVENTIVE_HEALTH_LABELS[h],
          value: h,
        })),
      },
    ]
  }, [sectors])

  const columns = React.useMemo<ColumnDef<Computer>[]>(() => {
    return [
      {
        accessorKey: 'assetTag',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Patrimônio" />,
        cell: ({ row }) => {
          const computer = row.original
          const isNb = computer.hostname.toUpperCase().includes('-NB-')
          const Icon = isNb ? Laptop : Monitor

          return (
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <span className="font-semibold tabular text-foreground">
                {computer.assetTag}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'hostname',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hostname / Modelo" />,
        cell: ({ row }) => {
          const computer = row.original
          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{computer.hostname}</span>
              <span className="text-xs text-muted-foreground">{computer.model}</span>
            </div>
          )
        },
      },
      {
        id: 'employeeName',
        accessorFn: (row) => row.assignment.employeeName,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Responsável" />,
        cell: ({ row }) => {
          const computer = row.original
          return (
            <div className="flex flex-col">
              <span className="font-medium">{computer.assignment.employeeName}</span>
              <span className="text-xs text-muted-foreground">{computer.assignment.location || computer.assignment.unit}</span>
            </div>
          )
        },
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
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <ComputerStatusBadge status={row.original.status} />,
      },
      {
        id: 'preventiveHealth',
        accessorFn: (row) => preventiveHealthOf(row),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Preventiva" />,
        cell: ({ row }) => {
          const health = preventiveHealthOf(row.original)
          return <PreventiveHealthBadge health={health} />
        },
      },
      {
        accessorKey: 'nextMaintenanceAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Próxima Prev." />,
        cell: ({ row }) => {
          const date = row.original.nextMaintenanceAt
          if (!date) return <span className="text-xs text-muted-foreground">—</span>
          return (
            <div className="flex flex-col text-xs">
              <span className="tabular font-medium">{formatDate(date)}</span>
              <span className="text-muted-foreground">{formatRelative(date)}</span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const computer = row.original
          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <ComputerRowActions
                computer={computer}
                onEdit={(comp) => {
                  setEditingComputer(comp)
                  setFormOpen(true)
                }}
                onDelete={(comp) => {
                  deleteComputer(comp.id)
                  toast.success(`Equipamento ${comp.assetTag} excluído.`)
                }}
                onNewMaintenance={(comp) => {
                  router.push(`/preventivas?nova=1&computerId=${comp.id}`)
                }}
              />
            </div>
          )
        },
      },
    ]
  }, [sectors, deleteComputer, router, remote])

  function handleExport(format: 'pdf' | 'xlsx' | 'csv') {
    try {
      if (format === 'pdf') {
        exportComputersPdf(computers, sectors)
      } else if (format === 'xlsx') {
        exportComputersXlsx(computers, sectors)
      } else {
        exportComputersCsv(computers, sectors)
      }
      toast.success(`Relatório exportado em ${format.toUpperCase()} com sucesso.`)
    } catch {
      toast.error('Erro ao exportar o relatório.')
    }
  }

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
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
        title="Inventário de Ativos"
        description="Gestão completa do parque de computadores, configurações de hardware e responsabilidades."
        actions={
          <div className="flex items-center gap-2">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" />
                  Novo Equipamento
                  <ChevronDown className="ml-2 size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditingComputer(undefined)
                    setFormOpen(true)
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Cadastro manual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/importar-telemetria')}>
                  <UploadCloud className="mr-2 size-4" />
                  Importar via CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Grid de Estatísticas Rápidas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total de Ativos"
          value={stats.total}
          icon={MonitorSmartphone}
          hint="Computadores no inventário"
        />
        <StatCard
          label="Equipamentos Ativos"
          value={stats.active}
          icon={CheckCircle2}
          tone="success"
          hint="Em operação normal"
        />
        <StatCard
          label="Em Manutenção"
          value={stats.inMaintenance}
          icon={Wrench}
          tone="info"
          hint="Em bancada técnica"
        />
        <StatCard
          label="Preventivas Atrasadas"
          value={stats.overdue}
          icon={AlertTriangle}
          tone={stats.overdue > 0 ? 'danger' : 'default'}
          hint="Exigem intervenção"
        />
        <StatCard
          label="Saúde Crítica"
          value={stats.critical}
          icon={AlertTriangle}
          tone={stats.critical > 0 ? 'danger' : 'default'}
          hint="SSD ou temperatura crítica"
        />
      </div>

      {/* Tabela de Dados TanStack */}
      <DataTable<Computer, unknown>
        columns={columns}
        data={computers}
        searchPlaceholder="Buscar por patrimônio, hostname ou responsável..."
        onRowClick={(row: Computer) => router.push(`/inventario/${row.id}`)}
        facets={facets}
      />

      {/* Dialog de Criação / Edição */}
      <ComputerFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            router.replace('/inventario')
          }
        }}
        computerToEdit={editingComputer}
        onSuccess={() => {
          // useRealInventory() não é um store global -- cada componente tem
          // sua própria cópia. O dialog já atualizou a dele; sem isto aqui,
          // a lista desta tela ficaria com o dado antigo até um F5.
          if (remote) void real.refresh()
        }}
      />
    </div>
  )
}
