'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartTooltip } from '@/components/charts/chart-tooltip'

interface LineSeries {
  key: string
  label: string
  color: string
  /** Empilha áreas que compartilham o mesmo identificador. */
  stackId?: string
}

interface VellorSeriesChartProps<T extends object> {
  data: T[]
  xKey: Extract<keyof T, string>
  series: LineSeries[]
  height?: number
  curved?: boolean
  valueFormatter?: (value: number) => string
  labelFormatter?: (label: string) => string
  categoryTickFormatter?: (value: string) => string
  showGrid?: boolean
  className?: string
}

const AXIS_TICK = { fontSize: 12, fill: 'var(--muted-foreground)' } as const
const CHART_MARGIN = { top: 8, right: 12, bottom: 0, left: -12 } as const

function legendLabel(value: unknown): React.ReactNode {
  return <span className="text-xs text-muted-foreground">{String(value)}</span>
}

/** useId traz caracteres inválidos para `url(#…)`; sobra só o alfanumérico. */
function useGradientPrefix(): string {
  const raw = React.useId()
  return React.useMemo(() => `vellor-grad-${raw.replace(/[^a-zA-Z0-9]/g, '')}`, [raw])
}

function VellorAreaChart<T extends object>({
  data,
  xKey,
  series,
  height,
  curved = true,
  valueFormatter,
  labelFormatter,
  categoryTickFormatter,
  showGrid = true,
  className,
}: VellorSeriesChartProps<T>) {
  const gradientPrefix = useGradientPrefix()
  const showLegend = series.length > 1
  const curve = curved ? 'monotone' : 'linear'

  const categoryTick = categoryTickFormatter
    ? (value: unknown) => categoryTickFormatter(String(value))
    : undefined
  const valueTick = valueFormatter
    ? (value: unknown) => (typeof value === 'number' ? valueFormatter(value) : String(value))
    : undefined

  return (
    <AreaChart
      accessibilityLayer
      className={className}
      data={data}
      height={height}
      margin={CHART_MARGIN}
    >
      <defs>
        {series.map((item, index) => (
          <linearGradient
            key={item.key}
            id={`${gradientPrefix}-${index}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="5%" stopColor={item.color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={item.color} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>

      {showGrid ? (
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      ) : null}

      <XAxis
        dataKey={xKey}
        tick={AXIS_TICK}
        tickFormatter={categoryTick}
        axisLine={false}
        tickLine={false}
        tickMargin={8}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={AXIS_TICK}
        tickFormatter={valueTick}
        axisLine={false}
        tickLine={false}
        width={48}
        allowDecimals={false}
      />

      <Tooltip
        content={<ChartTooltip valueFormatter={valueFormatter} labelFormatter={labelFormatter} />}
        cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
      />

      {showLegend ? (
        <Legend
          formatter={legendLabel}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ paddingTop: 12 }}
        />
      ) : null}

      {series.map((item, index) => (
        <Area
          key={item.key}
          type={curve}
          dataKey={item.key}
          name={item.label}
          stackId={item.stackId}
          stroke={item.color}
          strokeWidth={2}
          fill={`url(#${gradientPrefix}-${index})`}
          fillOpacity={1}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      ))}
    </AreaChart>
  )
}

function VellorLineChart<T extends object>({
  data,
  xKey,
  series,
  height,
  curved = true,
  valueFormatter,
  labelFormatter,
  categoryTickFormatter,
  showGrid = true,
  className,
}: VellorSeriesChartProps<T>) {
  const showLegend = series.length > 1
  const curve = curved ? 'monotone' : 'linear'

  const categoryTick = categoryTickFormatter
    ? (value: unknown) => categoryTickFormatter(String(value))
    : undefined
  const valueTick = valueFormatter
    ? (value: unknown) => (typeof value === 'number' ? valueFormatter(value) : String(value))
    : undefined

  return (
    <LineChart
      accessibilityLayer
      className={className}
      data={data}
      height={height}
      margin={CHART_MARGIN}
    >
      {showGrid ? (
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      ) : null}

      <XAxis
        dataKey={xKey}
        tick={AXIS_TICK}
        tickFormatter={categoryTick}
        axisLine={false}
        tickLine={false}
        tickMargin={8}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={AXIS_TICK}
        tickFormatter={valueTick}
        axisLine={false}
        tickLine={false}
        width={48}
        allowDecimals={false}
      />

      <Tooltip
        content={<ChartTooltip valueFormatter={valueFormatter} labelFormatter={labelFormatter} />}
        cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
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
        <Line
          key={item.key}
          type={curve}
          dataKey={item.key}
          name={item.label}
          stroke={item.color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      ))}
    </LineChart>
  )
}

export { VellorAreaChart, VellorLineChart }
export type { LineSeries, VellorSeriesChartProps }
