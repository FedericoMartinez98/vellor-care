'use client'

import * as React from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { ChartTooltip } from '@/components/charts/chart-tooltip'
import { cn } from '@/lib/utils'

interface DonutDatum {
  label: string
  value: number
  color: string
}

interface VellorDonutChartProps {
  data: DonutDatum[]
  height?: number
  centerLabel?: string
  centerValue?: React.ReactNode
  valueFormatter?: (value: number) => string
  /** Legenda ao lado do gráfico em telas largas (padrão) ou sempre abaixo. */
  legendPosition?: 'side' | 'below'
  className?: string
}

const PERCENT_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

function VellorDonutChart({
  data,
  height = 280,
  centerLabel,
  centerValue,
  valueFormatter,
  legendPosition = 'side',
  className,
}: VellorDonutChartProps) {
  const total = React.useMemo(
    () => data.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0), 0),
    [data],
  )

  const formatValue = React.useCallback(
    (value: number) => (valueFormatter ? valueFormatter(value) : value.toLocaleString('pt-BR')),
    [valueFormatter],
  )

  const colorResolver = React.useCallback(
    (name: string) => data.find((item) => item.label === name)?.color,
    [data],
  )

  const hasCenter = centerValue !== undefined && centerValue !== null

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center gap-4',
        legendPosition === 'side' && 'lg:flex-row lg:items-center lg:gap-6',
        className,
      )}
    >
      <div
        className={cn('relative w-full', legendPosition === 'side' && 'lg:flex-1')}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Tooltip
              content={
                <ChartTooltip valueFormatter={formatValue} colorResolver={colorResolver} />
              }
              cursor={false}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              cornerRadius={4}
              stroke="var(--card)"
              strokeWidth={1}
              isAnimationActive={false}
            >
              {data.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {hasCenter ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="tabular text-2xl font-semibold text-foreground">{centerValue}</span>
            {centerLabel ? (
              <span className="max-w-[60%] text-center text-xs text-muted-foreground">
                {centerLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul
        className={cn(
          'flex w-full flex-col gap-2',
          legendPosition === 'side' && 'lg:w-56 lg:shrink-0',
        )}
      >
        {data.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0

          return (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.label}</span>
              <span className="tabular font-medium text-foreground">
                {formatValue(item.value)}
              </span>
              <span className="tabular w-12 shrink-0 text-right text-xs text-muted-foreground">
                {PERCENT_FORMATTER.format(percent)}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { VellorDonutChart }
export type { DonutDatum, VellorDonutChartProps }
