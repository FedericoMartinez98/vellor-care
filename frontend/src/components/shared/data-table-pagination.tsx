'use client'

import * as React from 'react'
import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100]

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  /** Substantivo no plural usado na contagem (ex.: 'computadores'). */
  totalLabel?: string
}

export function DataTablePagination<TData>({
  table,
  totalLabel = 'registros',
}: DataTablePaginationProps<TData>) {
  const pageSizeLabelId = React.useId()
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const rowsOnPage = table.getRowModel().rows.length
  const selectedRows = table.getFilteredSelectedRowModel().rows.length

  const firstIndex = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const lastIndex = pageIndex * pageSize + rowsOnPage
  const pageCount = Math.max(1, table.getPageCount())

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {selectedRows > 0 ? (
          <>
            <span className="tabular">{selectedRows}</span> de{' '}
            <span className="tabular">{totalRows}</span> linha(s) selecionada(s)
          </>
        ) : (
          <>
            Mostrando <span className="tabular">{firstIndex}</span>–
            <span className="tabular">{lastIndex}</span> de{' '}
            <span className="tabular">{totalRows}</span> {totalLabel}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <span id={pageSizeLabelId} className="text-sm text-muted-foreground">
            Por página
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="w-[4.75rem]"
              aria-labelledby={pageSizeLabelId}
            >
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm font-medium whitespace-nowrap">
          Página <span className="tabular">{pageIndex + 1}</span> de{' '}
          <span className="tabular">{pageCount}</span>
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Ir para a primeira página"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
          >
            <ChevronsLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Ir para a página anterior"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Ir para a próxima página"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Ir para a última página"
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(pageCount - 1)}
          >
            <ChevronsRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export type { DataTablePaginationProps }
