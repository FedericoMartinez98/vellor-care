import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface SectionCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader className="flex flex-row items-start gap-3">
        {Icon ? (
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"
          >
            <Icon className="size-4 text-muted-foreground" />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  )
}

export { SectionCard }
