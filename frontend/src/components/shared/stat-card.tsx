import Link from 'next/link'
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type StatCardTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  hint?: string
  tone?: StatCardTone
  /** Variação em pontos percentuais; negativa indica queda. */
  trend?: { value: number; label?: string }
  href?: string
  isLoading?: boolean
  className?: string
}

/**
 * As classes precisam existir por extenso no código-fonte para o Tailwind
 * encontrá-las na varredura — nunca monte com template string.
 */
const TONE_CLASSES: Record<StatCardTone, { bg: string; fg: string }> = {
  default: { bg: 'bg-primary-soft', fg: 'text-primary' },
  success: { bg: 'bg-success-soft', fg: 'text-success' },
  warning: { bg: 'bg-warning-soft', fg: 'text-warning' },
  danger: { bg: 'bg-danger-soft', fg: 'text-danger' },
  info: { bg: 'bg-info-soft', fg: 'text-info' },
}

const TREND_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

function formatTrend(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${TREND_FORMATTER.format(value)}%`
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default',
  trend,
  href,
  isLoading = false,
  className,
}: StatCardProps) {
  const toneClasses = TONE_CLASSES[tone]
  const isPositiveTrend = trend ? trend.value >= 0 : true
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>

        {Icon ? (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              toneClasses.bg,
            )}
          >
            <Icon className={cn('size-4', toneClasses.fg)} />
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="mt-3 h-9 w-24" />
      ) : (
        <p className="mt-3 text-3xl font-semibold tracking-tight tabular">{value}</p>
      )}

      {isLoading ? (
        <Skeleton className="mt-2 h-4 w-32" />
      ) : trend ? (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <TrendIcon
            aria-hidden="true"
            className={cn('size-3.5', isPositiveTrend ? 'text-success' : 'text-danger')}
          />
          <span
            className={cn(
              'font-medium tabular',
              isPositiveTrend ? 'text-success' : 'text-danger',
            )}
          >
            {formatTrend(trend.value)}
          </span>
          {trend.label ? <span className="text-muted-foreground">{trend.label}</span> : null}
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className="focus-ring block rounded-xl">
        <Card
          className={cn(
            'gap-0 p-5 transition-colors hover:border-primary/40',
            className,
          )}
        >
          {body}
        </Card>
      </Link>
    )
  }

  return <Card className={cn('gap-0 p-5', className)}>{body}</Card>
}

export { StatCard }
