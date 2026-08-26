'use client'

import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={cn('whitespace-nowrap', className)}>{title}</span>
  }

  const sorted = column.getIsSorted()
  const sortDescription =
    sorted === 'asc'
      ? 'ordenado de forma crescente'
      : sorted === 'desc'
        ? 'ordenado de forma decrescente'
        : 'sem ordenação'

  return (
    <div className={cn('flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Ordenar por ${title}, ${sortDescription}`}
            className="-ml-3 h-8 gap-1.5 font-semibold uppercase tracking-wide data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {sorted === 'asc' ? (
              <ArrowUp className="size-3.5" aria-hidden="true" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden="true" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => column.toggleSorting(false)}>
            <ArrowUp aria-hidden="true" />
            Crescente
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => column.toggleSorting(true)}>
            <ArrowDown aria-hidden="true" />
            Decrescente
          </DropdownMenuItem>

          {column.getCanHide() ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => column.toggleVisibility(false)}>
                <EyeOff aria-hidden="true" />
                Ocultar coluna
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export type { DataTableColumnHeaderProps }
