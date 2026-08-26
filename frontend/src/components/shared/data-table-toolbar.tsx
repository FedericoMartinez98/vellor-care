'use client'

import type * as React from 'react'
import type { Column, Table } from '@tanstack/react-table'
import { Search, Settings2, X } from 'lucide-react'

import { DataTableFacetedFilter } from '@/components/shared/data-table-faceted-filter'
import type { DataTableFacet } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupIcon, inputGroupInputClass } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchPlaceholder?: string
  facets?: DataTableFacet[]
  actions?: React.ReactNode
  globalFilter: string
  setGlobalFilter: (value: string) => void
}

/**
 * Rótulo legível de uma coluna. As definições de coluna devem declarar
 * `meta: { label: 'Setor' }` — sem isso, o menu de visibilidade cai no `column.id`,
 * que costuma ser o nome cru do campo.
 */
function columnLabel<TData>(column: Column<TData, unknown>): string {
  const meta: unknown = column.columnDef.meta

  if (meta !== null && typeof meta === 'object' && 'label' in meta) {
    const label: unknown = meta.label
    if (typeof label === 'string' && label.length > 0) return label
  }

  return column.id
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder,
  facets,
  actions,
  globalFilter,
  setGlobalFilter,
}: DataTableToolbarProps<TData>) {
  const hasColumnFilters = table.getState().columnFilters.length > 0
  const isFiltered = hasColumnFilters || globalFilter.trim().length > 0
  const hideableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide())

  function clearFilters() {
    table.resetColumnFilters()
    setGlobalFilter('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {searchPlaceholder ? (
        <InputGroup className="w-full sm:max-w-xs">
          <InputGroupIcon>
            <Search />
          </InputGroupIcon>
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={cn(inputGroupInputClass, 'h-9')}
          />
        </InputGroup>
      ) : null}

      {facets?.map((facet) => {
        const column = table.getColumn(facet.columnId)
        if (!column) return null

        return (
          <DataTableFacetedFilter
            key={facet.columnId}
            column={column}
            title={facet.title}
            options={facet.options}
          />
        )
      })}

      {isFiltered ? (
        <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
          Limpar
          <X className="size-4" aria-hidden="true" />
        </Button>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {hideableColumns.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9" aria-label="Exibir colunas">
                <Settings2 className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Colunas</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Colunas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
                  onSelect={(event) => event.preventDefault()}
                >
                  {columnLabel(column)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {actions}
      </div>
    </div>
  )
}

export type { DataTableToolbarProps }
