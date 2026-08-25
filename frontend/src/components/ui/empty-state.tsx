import * as React from 'react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Ícone (ex.: um ícone do lucide-react) exibido dentro do círculo. */
  icon?: React.ElementType
  title: string
  description?: string
  /** Ação principal — normalmente um <Button>. */
  action?: React.ReactNode
  className?: string
}

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex w-full flex-col items-center justify-center px-6 py-14 text-center',
        className,
      )}
    >
      {Icon ? (
        <div
          aria-hidden="true"
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted"
        >
          <Icon className="size-6 text-muted-foreground" />
        </div>
      ) : null}

      <p data-slot="empty-state-title" className="font-medium text-foreground">
        {title}
      </p>

      {description ? (
        <p
          data-slot="empty-state-description"
          className="mt-1.5 max-w-sm text-sm text-muted-foreground"
        >
          {description}
        </p>
      ) : null}

      {action ? (
        <div
          data-slot="empty-state-action"
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          {action}
        </div>
      ) : null}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
