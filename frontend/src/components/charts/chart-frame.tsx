'use client'

import * as React from 'react'
import { BarChart3 } from 'lucide-react'
import { ResponsiveContainer } from 'recharts'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

interface ChartFrameProps {
  title: string
  description?: string
  action?: React.ReactNode
  /** ResponsiveContainer aceita apenas um elemento — passe o gráfico direto. */
  children: React.ReactElement
  height?: number
  className?: string
  empty?: boolean
  emptyLabel?: string
  /**
   * Dispensa o ResponsiveContainer interno para conteúdos que já trazem o seu
   * (ex.: o donut, que combina gráfico + legenda própria).
   */
  raw?: boolean
}

function ChartFrame({
  title,
  description,
  action,
  children,
  height = 300,
  className,
  empty = false,
  emptyLabel,
  raw = false,
}: ChartFrameProps) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>

      <CardContent className="pb-1">
        {empty ? (
          <div
            className="flex w-full items-center justify-center"
            style={{ minHeight: Math.min(height, 240) }}
          >
            <EmptyState icon={BarChart3} title={emptyLabel ?? 'Sem dados no período.'} />
          </div>
        ) : raw ? (
          children
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {children}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export { ChartFrame }
export type { ChartFrameProps }
