'use client'

/**
 * Módulo de Gestão de Estoque de Peças e Insumos:
 * - Catálogo completo de hardware (SSD, RAM, Coolers, Pasta Térmica, etc.)
 * - Razão auditável de movimentações (entradas, saídas automáticas por preventiva, descartes)
 * - Alerta de estoque mínimo
 */

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  DollarSign,
  Download,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { MovementDialog } from '@/components/estoque/movement-dialog'
import { PartFormDialog } from '@/components/estoque/part-form-dialog'
import { PageHeader } from '@/components/layout/page-header'
import {
  ConfirmDialog,
  DataTable,
  DataTableColumnHeader,
  StatCard,
  type DataTableFacet,
} from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MOVEMENT_TYPE_LABELS,
  PART_CATEGORY_LABELS,
} from '@/lib/constants'
import { exportPartsCsv, exportPartsPdf, exportPartsXlsx } from '@/lib/export'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { isRemoteBackend } from '@/lib/api'
import { useRealParts } from '@/lib/hooks/use-real-parts'
import { useVellor } from '@/lib/store'
import {
  MOVEMENT_TYPE,
  PART_CATEGORY,
  type InventoryMovement,
  type InventoryPart,
} from '@/lib/types'

export function PartsView() {
  const mock = useVellor()
  const real = useRealParts()
  const remote = isRemoteBackend()

  // Leitura (catalogo e razao de movimentos) ja vem do backend real. Excluir
  // peca continua no mock porque o backend NAO expoe DELETE /parts -- o botao
  // fica desabilitado no modo remoto em vez de fingir que funcionou.
  const { deletePart } = mock
  const ready = remote ? real.ready : mock.ready
  const parts = remote ? real.parts : mock.parts
  const movements = remote ? real.movements : mock.movements

  const [partFormOpen, setPartFormOpen] = React.useState(false)
  const [movementOpen, setMovementOpen] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

  const [selectedPart, setSelectedPart] = React.useState<InventoryPart | undefined>()
  const [partToDelete, setPartToDelete] = React.useState<InventoryPart | undefined>()

  // Estatísticas de estoque
  const stats = React.useMemo(() => {
    const totalItems = parts.length
    const totalValue = parts.reduce((acc, p) => acc + p.quantity * p.unitValue, 0)
    const lowStock = parts.filter((p) => p.quantity <= p.minimumQuantity).length
    const movementsCount = movements.length

    return { totalItems, totalValue, lowStock, movementsCount }
  }, [parts, movements])

  const partFacets = React.useMemo<DataTableFacet[]>(() => {
    return [
      {
        columnId: 'category',
        title: 'Categoria',
        options: PART_CATEGORY.map((c) => ({
          label: PART_CATEGORY_LABELS[c],
          value: c,
        })),
      },
    ]
  }, [])

  const movementFacets = React.useMemo<DataTableFacet[]>(() => {
    return [
      {
        columnId: 'type',
        title: 'Tipo de Movimento',
        options: MOVEMENT_TYPE.map((t) => ({
          label: MOVEMENT_TYPE_LABELS[t],
          value: t,
        })),
      },
    ]
  }, [])

  // Colunas do Catálogo de Peças
  const partColumns = React.useMemo<ColumnDef<InventoryPart>[]>(() => {
    return [
      {
        accessorKey: 'sku',
        header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground">
            {row.original.sku}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nome do Item" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.location || 'Sem localização'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Categoria" />,
        cell: ({ row }) => (
          <Badge variant="outline">{PART_CATEGORY_LABELS[row.original.category]}</Badge>
        ),
      },
      {
        accessorKey: 'quantity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Saldo Atual" />,
        cell: ({ row }) => {
          const part = row.original
          const isLow = part.quantity <= part.minimumQuantity
          const isZero = part.quantity === 0

          return (
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular text-foreground">
                {formatNumber(part.quantity)} {part.unit}
              </span>
              {isZero ? (
                <Badge variant="danger">Esgotado</Badge>
              ) : isLow ? (
                <Badge variant="warning">Mínimo atingido</Badge>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'minimumQuantity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Estoque Mín." />,
        cell: ({ row }) => (
          <span className="tabular text-xs text-muted-foreground">
            {formatNumber(row.original.minimumQuantity)} {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'unitValue',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Valor Unit." />,
        cell: ({ row }) => (
          <span className="tabular text-xs font-medium">
            {formatCurrency(row.original.unitValue)}
          </span>
        ),
      },
      {
        id: 'totalValue',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Valor Total" />,
        cell: ({ row }) => (
          <span className="tabular text-xs font-semibold">
            {formatCurrency(row.original.quantity * row.original.unitValue)}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const part = row.original
          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedPart(part)
                      setMovementOpen(true)
                    }}
                  >
                    <ArrowRightLeft className="mr-2 size-4" />
                    Movimentar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedPart(part)
                      setPartFormOpen(true)
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-danger"
                    disabled={remote}
                    title={
                      remote
                        ? 'Exclusão de peça ainda não existe na API — só é possível pelo banco.'
                        : undefined
                    }
                    onClick={() => {
                      setPartToDelete(part)
                      setDeleteConfirmOpen(true)
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ]
  }, [])

  // Colunas do Razão de Movimentações
  const movementColumns = React.useMemo<ColumnDef<InventoryMovement>[]>(() => {
    return [
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Data / Hora" />,
        cell: ({ row }) => (
          <span className="tabular text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: 'partName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Peça" />,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.partName}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
        cell: ({ row }) => {
          const type = row.original.type
          const tone =
            type === 'ENTRADA'
              ? 'success'
              : type === 'SAIDA'
                ? 'warning'
                : type === 'DESCARTE'
                  ? 'danger'
                  : 'secondary'
          return <Badge variant={tone}>{MOVEMENT_TYPE_LABELS[type]}</Badge>
        },
      },
      {
        accessorKey: 'quantity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Qtd." />,
        cell: ({ row }) => {
          const isPositive = row.original.type === 'ENTRADA'
          return (
            <span className={`tabular font-semibold text-xs ${isPositive ? 'text-success' : 'text-danger'}`}>
              {isPositive ? '+' : '-'}
              {formatNumber(row.original.quantity)}
            </span>
          )
        },
      },
      {
        accessorKey: 'balanceAfter',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Saldo Posterior" />,
        cell: ({ row }) => (
          <span className="tabular text-xs font-medium text-foreground">
            {formatNumber(row.original.balanceAfter)}
          </span>
        ),
      },
      {
        accessorKey: 'userName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Responsável" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.userName}</span>
        ),
      },
      {
        accessorKey: 'reason',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo / OS" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.reason || (row.original.computerAssetTag ? `OS: ${row.original.computerAssetTag}` : '—')}
          </span>
        ),
      },
    ]
  }, [])

  function handleExport(format: 'pdf' | 'xlsx' | 'csv') {
    try {
      if (format === 'pdf') {
        exportPartsPdf(parts)
      } else if (format === 'xlsx') {
        exportPartsXlsx(parts)
      } else {
        exportPartsCsv(parts)
      }
      toast.success(`Catálogo exportado em ${format.toUpperCase()} com sucesso.`)
    } catch {
      toast.error('Erro ao exportar as peças.')
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
        title="Estoque de Peças e Insumos"
        description="Controle de inventário de hardware, peças de reposição e registro contínuo de movimentações."
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

            <Button
              variant="outline"
              onClick={() => {
                setSelectedPart(undefined)
                setMovementOpen(true)
              }}
            >
              <ArrowRightLeft className="mr-2 size-4" />
              Movimentar
            </Button>

            <Button
              onClick={() => {
                setSelectedPart(undefined)
                setPartFormOpen(true)
              }}
            >
              <Plus className="mr-2 size-4" />
              Nova Peça
            </Button>
          </div>
        }
      />

      {/* Grid de Estatísticas Rápidas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de Peças Cadastradas"
          value={stats.totalItems}
          icon={Boxes}
          hint="Itens no catálogo"
        />
        <StatCard
          label="Valor Total do Estoque"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
          tone="success"
          hint="Custo acumulado em estoque"
        />
        <StatCard
          label="Itens com Estoque Baixo"
          value={stats.lowStock}
          icon={AlertTriangle}
          tone={stats.lowStock > 0 ? 'warning' : 'default'}
          hint="Abaixo da quantidade mínima"
        />
        <StatCard
          label="Movimentações Registradas"
          value={stats.movementsCount}
          icon={ArrowRightLeft}
          tone="info"
          hint="Histórico auditável de estoque"
        />
      </div>

      {/* Abas: Catálogo vs Movimentações */}
      <Tabs defaultValue="catalogo" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-80">
          <TabsTrigger value="catalogo">Catálogo e Saldos</TabsTrigger>
          <TabsTrigger value="movimentacoes">
            Movimentações ({movements.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="catalogo" className="m-0 focus-visible:outline-none">
            <DataTable<InventoryPart, unknown>
              columns={partColumns}
              data={parts}
              searchPlaceholder="Buscar por SKU ou nome da peça..."
              facets={partFacets}
            />
          </TabsContent>

          <TabsContent value="movimentacoes" className="m-0 focus-visible:outline-none">
            <DataTable<InventoryMovement, unknown>
              columns={movementColumns}
              data={movements}
              searchPlaceholder="Buscar movimentações por peça ou motivo..."
              facets={movementFacets}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      <PartFormDialog
        open={partFormOpen}
        onOpenChange={setPartFormOpen}
        partToEdit={selectedPart}
      />

      <MovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        initialPart={selectedPart}
      />

      {partToDelete ? (
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={`Excluir a peça ${partToDelete.name}?`}
          description="A peça será removida do catálogo. Seu histórico de movimentações anteriores será preservado."
          confirmLabel="Excluir Peça"
          destructive
          onConfirm={() => {
            deletePart(partToDelete.id)
            toast.success(`Peça ${partToDelete.name} excluída.`)
          }}
        />
      ) : null}
    </div>
  )
}
