import * as React from 'react'
import Link from 'next/link'
import { Circle, History, type LucideIcon } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export type TimelineTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface TimelineItem {
  id: string
  title: string
  description?: React.ReactNode
  date: string
  icon?: LucideIcon
  tone?: TimelineTone
  content?: React.ReactNode
  href?: string
}

export interface TimelineProps {
  items: TimelineItem[]
  emptyLabel?: string
  className?: string
}

/** Classes escritas por extenso para o Tailwind detectá-las na varredura. */
const TONE_CLASSES: Record<TimelineTone, { bg: string; fg: string }> = {
  default: { bg: 'bg-muted', fg: 'text-muted-foreground' },
  success: { bg: 'bg-success-soft', fg: 'text-success' },
  warning: { bg: 'bg-warning-soft', fg: 'text-warning' },
  danger: { bg: 'bg-danger-soft', fg: 'text-danger' },
  info: { bg: 'bg-info-soft', fg: 'text-info' },
}

function Timeline({ items, emptyLabel = 'Nenhum registro por aqui.', className }: TimelineProps) {
  if (items.length === 0) {
    return <EmptyState icon={History} title={emptyLabel} className={className} />
  }

  return (
    <ol className={cn('relative flex flex-col', className)}>
      {items.map((item, index) => {
        const Icon = item.icon ?? Circle
        const toneClasses = TONE_CLASSES[item.tone ?? 'default']
        const isLast = index === items.length - 1

        return (
          <li key={item.id} className={cn('relative flex gap-4', isLast ? 'pb-0' : 'pb-6')}>
            {/* A trilha só desce até o penúltimo item: o último não tem continuação. */}
            {isLast ? null : (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-4 top-8 w-px bg-border"
              />
            )}

            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-background',
                toneClasses.bg,
              )}
            >
              <Icon className={cn('size-4', toneClasses.fg)} />
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="focus-ring rounded-sm text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{item.title}</p>
                )}

                <time dateTime={item.date} className="text-xs text-muted-foreground tabular">
                  {formatDateTime(item.date)}
                </time>
              </div>

              {item.description ? (
                <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
              ) : null}

              {item.content ? (
                <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  {item.content}
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export { Timeline }
