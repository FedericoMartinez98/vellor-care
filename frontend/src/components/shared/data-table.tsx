'use client'

import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { Inbox, SearchX, type LucideIcon } from 'lucide-react'

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { DataTableToolbar } from '@/components/shared/data-table-toolbar'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const SKELETON_ROWS = 6

export interface DataTableFacet {
  columnId: string
  title: string
  options: { label: string; value: string; icon?: LucideIcon; dot?: string }[]
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** placeholder do campo de busca; se ausente, o campo nao aparece */
  searchPlaceholder?: string
  /** filtros por faceta exibidos na toolbar */
  facets?: DataTableFacet[]
  /** acoes a direita da toolbar (ex.: botao Exportar, Novo) */
  toolbarActions?: React.ReactNode
  /** navegacao ao clicar na linha */
  onRowClick?: (row: TData) => void
  /** chave estavel da linha */
  getRowId?: (row: TData) => string
  initialSorting?: SortingState
  initialPageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  /** ativa checkbox de selecao (a coluna deve ser fornecida pelo consumidor) */
  enableRowSelection?: boolean
  isLoading?: boolean
  className?: string
}

/** Remove acentuação e caixa para que "sao paulo" também encontre "São Paulo". */
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Converte o valor bruto de uma célula em texto pesquisável. */
function toSearchableText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((item: unknown) => toSearchableText(item)).join(' ')
  return ''
}

/**
 * Tabela genérica do sistema: busca global sem acento, filtros por faceta,
 * ordenação, visibilidade de colunas, seleção e paginação no cliente.
 *
 * ATENÇÃO às colunas de ação: quando `onRowClick` está ativo, o clique em
 * qualquer célula navega. Toda coluna que contenha botão, menu, link ou
 * checkbox DEVE chamar `event.stopPropagation()` no `onClick` do controle
 * (e o wrapper da célula deve fazer o mesmo), caso contrário a ação dispara
 * a navegação da linha junto. Exemplo na definição da coluna:
 *
 *   cell: ({ row }) => (
 *     <div onClick={(event) => event.stopPropagation()}>
 *       <RowActions computer={row.original} />
 *     </div>
 *   )
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder,
  facets,
  toolbarActions,
  onRowClick,
  getRowId,
  initialSorting,
  initialPageSize = 10,
  emptyTitle,
  emptyDescription,
  enableRowSelection = false,
  isLoading = false,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting ?? [])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  /** Busca global: casa o termo contra qualquer célula visível da linha, ignorando acentos. */
  const globalFilterFn: FilterFn<TData> = React.useCallback((row, _columnId, filterValue) => {
    const term = normalizeText(toSearchableText(filterValue)).trim()
    if (term.length === 0) return true

    return row
      .getVisibleCells()
      .some((cell) => normalizeText(toSearchableText(cell.getValue())).includes(term))
  }, [])

  const resolveRowId = React.useMemo(
    () => (getRowId ? (originalRow: TData) => getRowId(originalRow) : undefined),
    [getRowId],
  )

  /**
   * As facetas guardam o filtro como array de valores. O filtro automático do
   * TanStack ('includesString') trataria esse array como texto e casaria por
   * substring — 'ativo' acabaria marcando 'inativo'. Aqui a comparação é exata.
   * Uma coluna que declare o próprio `filterFn` continua no comando.
   */
  const defaultColumn = React.useMemo<Partial<ColumnDef<TData, unknown>>>(
    () => ({
      filterFn: (row, columnId, filterValue) => {
        if (!Array.isArray(filterValue)) return true

        const selected = filterValue.filter((item): item is string => typeof item === 'string')
        if (selected.length === 0) return true

        const value: unknown = row.getValue(columnId)
        if (Array.isArray(value)) {
          return value.some((item: unknown) => typeof item === 'string' && selected.includes(item))
        }

        return value !== null && value !== undefined && selected.includes(String(value))
      },
    }),
    [],
  )

  const table = useReactTable<TData>({
    data,
    columns,
    defaultColumn,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter, pagination },
    enableRowSelection,
    getRowId: resolveRowId,
    globalFilterFn,
    // Por padrão o TanStack só considera "pesquisáveis" as colunas cuja primeira
    // linha traz string ou número — e desliga a busca global quando nenhuma passa.
    // Como o nosso filtro varre a linha inteira, toda coluna é um ponto de entrada válido.
    getColumnCanGlobalFilter: () => true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const rows = table.getRowModel().rows
  const visibleColumnCount = Math.max(1, table.getVisibleLeafColumns().length)
  const hasActiveFilters = columnFilters.length > 0 || globalFilter.trim().length > 0
  const isInteractive = typeof onRowClick === 'function'

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <DataTableToolbar
        table={table}
        searchPlaceholder={searchPlaceholder}
        facets={facets}
        actions={toolbarActions}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                    {table.getVisibleLeafColumns().map((column) => (
                      <TableCell key={column.id} className="py-3">
                        <Skeleton className="h-4 w-full max-w-40" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  {/* colSpan usa as colunas visíveis para cobrir a largura real da tabela. */}
                  <TableCell colSpan={visibleColumnCount} className="p-0">
                    <EmptyState
                      icon={hasActiveFilters ? SearchX : Inbox}
                      title={emptyTitle ?? 'Nenhum registro encontrado'}
                      description={
                        emptyDescription ??
                        (hasActiveFilters
                          ? 'Ajuste a busca ou os filtros aplicados para ver mais resultados.'
                          : undefined)
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    role={isInteractive ? 'button' : undefined}
                    tabIndex={isInteractive ? 0 : undefined}
                    className={cn(
                      isInteractive &&
                        'cursor-pointer outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset',
                    )}
                    onClick={
                      onRowClick
                        ? () => {
                            onRowClick(row.original)
                          }
                        : undefined
                    }
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            // Só reage quando o foco está na própria linha: Enter/Espaço
                            // dentro de um botão ou checkbox da linha pertencem a ele.
                            if (event.target !== event.currentTarget) return
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            onRowClick(row.original)
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-t border-border px-3 py-3">
          <DataTablePagination table={table} />
        </div>
      </div>
    </div>
  )
}
