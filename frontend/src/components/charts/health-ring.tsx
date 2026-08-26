'use client'

import { cn } from '@/lib/utils'

type HealthRingTone = 'success' | 'warning' | 'danger'

interface HealthRingProps {
  value: number
  max?: number
  label?: string
  sublabel?: string
  tone?: HealthRingTone
  size?: number
  unit?: string
  /** Escalas em que valor alto é ruim (temperatura, por exemplo). */
  invert?: boolean
  className?: string
}

const TONE_STROKE: Record<HealthRingTone, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}

const TONE_TEXT: Record<HealthRingTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

const VALUE_FORMATTER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function deriveTone(percent: number, invert: boolean): HealthRingTone {
  const score = invert ? 100 - percent : percent
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'danger'
}

function HealthRing({
  value,
  max = 100,
  label,
  sublabel,
  tone,
  size = 128,
  unit = '%',
  invert = false,
  className,
}: HealthRingProps) {
  const safeValue = Number.isFinite(value) ? value : 0
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100

  const ratio = clampRatio(safeValue / safeMax)
  const percent = ratio * 100
  const resolvedTone = tone ?? deriveTone(percent, invert)

  const strokeWidth = Math.max(6, Math.round(size * 0.09))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - ratio)
  const center = size / 2

  const valueText = VALUE_FORMATTER.format(safeValue)
  const ariaLabel = [
    label,
    `${valueText}${unit} de ${VALUE_FORMATTER.format(safeMax)}${unit}`,
    sublabel,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' — ')

  return (
    <div className={cn('flex flex-col items-center gap-2 text-center', className)}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={TONE_STROKE[resolvedTone]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-baseline gap-0.5">
            <span
              className={cn('tabular font-semibold leading-none', TONE_TEXT[resolvedTone])}
              style={{ fontSize: Math.round(size * 0.24) }}
            >
              {valueText}
            </span>
            {unit ? (
              <span
                className="font-medium leading-none text-muted-foreground"
                style={{ fontSize: Math.round(size * 0.12) }}
              >
                {unit}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {label ? <p className="text-sm font-medium text-foreground">{label}</p> : null}
      {sublabel ? <p className="text-xs text-muted-foreground">{sublabel}</p> : null}
    </div>
  )
}

export { HealthRing }
export type { HealthRingProps, HealthRingTone }
