'use client'

import type { TooltipProps } from 'recharts'
import type {
  NameType,
  Payload,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent'

import { cn } from '@/lib/utils'

interface ChartTooltipExtraProps {
  /** Formata o valor numérico de cada série. */
  valueFormatter?: (value: number) => string
  /** Formata o rótulo do eixo exibido no topo. */
  labelFormatter?: (label: string) => string
  /**
   * Resolve a cor do marcador quando o gráfico não a envia no payload
   * (é o caso do PieChart, que monta o payload sem `color`).
   */
  colorResolver?: (name: string, index: number) => string | undefined
  className?: string
}

type ChartTooltipProps = Omit<
  TooltipProps<ValueType, NameType>,
  'labelFormatter' | 'formatter'
> &
  ChartTooltipExtraProps

function toNumber(value: ValueType | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function readableValue(
  value: ValueType | undefined,
  valueFormatter?: (value: number) => string,
): string {
  const numeric = toNumber(value)
  if (numeric !== null) {
    return valueFormatter ? valueFormatter(numeric) : numeric.toLocaleString('pt-BR')
  }
  if (Array.isArray(value)) return value.join(' – ')
  return value === undefined ? '—' : String(value)
}

function markerColor(
  entry: Payload<ValueType, NameType>,
  name: string,
  index: number,
  colorResolver?: (name: string, index: number) => string | undefined,
): string {
  return (
    colorResolver?.(name, index) ??
    entry.color ??
    entry.stroke ??
    entry.fill ??
    'var(--muted-foreground)'
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  colorResolver,
  className,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  const rawLabel: unknown = label
  const heading =
    typeof rawLabel === 'string' || typeof rawLabel === 'number' ? String(rawLabel) : ''
  const title = heading && labelFormatter ? labelFormatter(heading) : heading

  return (
    <div
      className={cn(
        'min-w-36 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-pop)]',
        className,
      )}
    >
      {title ? <p className="mb-1.5 font-medium text-foreground">{title}</p> : null}

      <ul className="flex flex-col gap-1">
        {payload.map((entry, index) => {
          const name = entry.name === undefined ? String(entry.dataKey ?? '') : String(entry.name)
          const color = markerColor(entry, name, index, colorResolver)

          return (
            <li
              key={`${String(entry.dataKey ?? name)}-${index}`}
              className="flex items-center gap-2"
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="truncate text-muted-foreground">{name}</span>
              <span className="tabular ml-auto pl-2 font-medium text-foreground">
                {readableValue(entry.value, valueFormatter)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { ChartTooltip }
export type { ChartTooltipProps }
