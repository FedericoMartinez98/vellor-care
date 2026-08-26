import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type InfoListColumns = 1 | 2 | 3

export interface InfoListItem {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  /** Ocupa a linha inteira (para textos longos, observações etc.). */
  span?: boolean
}

export interface InfoListProps {
  items: InfoListItem[]
  columns?: InfoListColumns
  className?: string
}

const GRID_CLASSES: Record<InfoListColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}

const SPAN_CLASSES: Record<InfoListColumns, string> = {
  1: 'col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
}

function isEmptyValue(value: React.ReactNode): boolean {
  if (value === null || value === undefined || value === false) return true
  if (typeof value === 'string') return value.trim().length === 0
  return false
}

function InfoList({ items, columns = 2, className }: InfoListProps) {
  return (
    <dl className={cn('grid gap-4', GRID_CLASSES[columns], className)}>
      {items.map((item, index) => {
        const Icon = item.icon
        const empty = isEmptyValue(item.value)

        return (
          <div
            key={`${item.label}-${index}`}
            className={cn('min-w-0', item.span ? SPAN_CLASSES[columns] : undefined)}
          >
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              {Icon ? <Icon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
              <span className="truncate">{item.label}</span>
            </dt>

            <dd
              className={cn(
                'mt-1 break-words text-sm',
                empty ? 'text-muted-foreground' : 'font-medium',
              )}
            >
              {empty ? '—' : item.value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export { InfoList }
