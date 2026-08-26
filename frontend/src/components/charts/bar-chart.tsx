'use client'

import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartTooltip } from '@/components/charts/chart-tooltip'

interface BarSeries {
  key: string
  label: string
  color: string
  stackId?: string
}

/**
 * Orientação das barras no vocabulário do produto:
 * 'vertical' = barras em pé (colunas), 'horizontal' = barras deitadas.
 * Atenção: o Recharts usa a convenção oposta na prop `layout`.
 */
type BarChartLayout = 'vertical' | 'horizontal'

interface VellorBarChartProps<T extends object> {
  data: T[]
  xKey: Extract<keyof T, string>
  series: BarSeries[]
  height?: number
  layout?: BarChartLayout
  valueFormatter?: (value: number) => string
  labelFormatter?: (label: string) => string
  categoryTickFormatter?: (value: string) => string
  /** Largura reservada ao eixo de categorias quando as barras são deitadas. */
  categoryAxisWidth?: number
  showGrid?: boolean
  className?: string
}

const AXIS_TICK = { fontSize: 12, fill: 'var(--muted-foreground)' } as const

function legendLabel(value: unknown): React.ReactNode {
  return <span className="text-xs text-muted-foreground">{String(value)}</span>
}

function VellorBarChart<T extends object>({
  data,
  xKey,
  series,
  height,
  layout = 'vertical',
  valueFormatter,
  labelFormatter,
  categoryTickFormatter,
  categoryAxisWidth = 96,
  showGrid = true,
  className,
}: VellorBarChartProps<T>) {
  const isColumns = layout === 'vertical'
  const showLegend = series.length > 1

  const categoryTick = categoryTickFormatter
    ? (value: unknown) => categoryTickFormatter(String(value))
    : undefined
  const valueTick = valueFormatter
    ? (value: unknown) => (typeof value === 'number' ? valueFormatter(value) : String(value))
    : undefined

  return (
    <BarChart
      accessibilityLayer
      className={className}
      data={data}
      height={height}
      layout={isColumns ? 'horizontal' : 'vertical'}
      margin={{ top: 8, right: 12, bottom: 0, left: isColumns ? -12 : 0 }}
    >
      {showGrid ? (
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={!isColumns}
          horizontal={isColumns}
        />
      ) : null}

      {isColumns ? (
        <>
          <XAxis
            dataKey={xKey}
            type="category"
            tick={AXIS_TICK}
            tickFormatter={categoryTick}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            type="number"
            tick={AXIS_TICK}
            tickFormatter={valueTick}
            axisLine={false}
            tickLine={false}
            width={48}
            allowDecimals={false}
          />
        </>
      ) : (
        <>
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickFormatter={valueTick}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            allowDecimals={false}
          />
          <YAxis
            dataKey={xKey}
            type="category"
            tick={AXIS_TICK}
            tickFormatter={categoryTick}
            axisLine={false}
            tickLine={false}
            width={categoryAxisWidth}
          />
        </>
      )}

      <Tooltip
        content={
          <ChartTooltip valueFormatter={valueFormatter} labelFormatter={labelFormatter} />
        }
        cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
      />

      {showLegend ? (
        <Legend
          formatter={legendLabel}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ paddingTop: 12 }}
        />
      ) : null}

      {series.map((item) => (
        <Bar
          key={item.key}
          dataKey={item.key}
          name={item.label}
          fill={item.color}
          stackId={item.stackId}
          radius={isColumns ? [6, 6, 0, 0] : [0, 6, 6, 0]}
          maxBarSize={44}
        />
      ))}
    </BarChart>
  )
}

export { VellorBarChart }
export type { BarSeries, BarChartLayout, VellorBarChartProps }
