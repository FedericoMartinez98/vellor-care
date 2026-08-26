import { Badge } from '@/components/ui/badge'
import {
  COMPUTER_STATUS_TONE,
  MAINTENANCE_STATUS_TONE,
  PREVENTIVE_HEALTH_TONE,
  PRIORITY_TONE,
  SEVERITY_TONE,
  type ToneAppearance,
} from '@/lib/constants'
import type {
  ComputerStatus,
  MaintenanceStatus,
  PreventiveHealth,
  Priority,
  Sector,
  Severity,
} from '@/lib/types'
import { cn } from '@/lib/utils'

interface ToneBadgeProps {
  tone: ToneAppearance
  className?: string
}

/** Base comum: pontinho colorido + rótulo em pt-BR, com o tom vindo das constantes. */
function ToneBadge({ tone, className }: ToneBadgeProps) {
  return (
    <Badge variant={tone.badge} className={cn('gap-1.5', className)}>
      <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', tone.dot)} />
      {tone.label}
    </Badge>
  )
}

function ComputerStatusBadge({
  status,
  className,
}: {
  status: ComputerStatus
  className?: string
}) {
  return <ToneBadge tone={COMPUTER_STATUS_TONE[status]} className={className} />
}

function MaintenanceStatusBadge({
  status,
  className,
}: {
  status: MaintenanceStatus
  className?: string
}) {
  return <ToneBadge tone={MAINTENANCE_STATUS_TONE[status]} className={className} />
}

function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return <ToneBadge tone={PRIORITY_TONE[priority]} className={className} />
}

function PreventiveHealthBadge({
  health,
  className,
}: {
  health: PreventiveHealth
  className?: string
}) {
  return <ToneBadge tone={PREVENTIVE_HEALTH_TONE[health]} className={className} />
}

function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return <ToneBadge tone={SEVERITY_TONE[severity]} className={className} />
}

function SectorBadge({ sector, className }: { sector?: Sector; className?: string }) {
  if (!sector) {
    return (
      <Badge variant="muted" className={cn('gap-1.5', className)}>
        —
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={cn('gap-1.5', className)}>
      {/* A cor vem do cadastro do setor, por isso o style inline. */}
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: sector.color }}
      />
      {sector.name}
    </Badge>
  )
}

export {
  ComputerStatusBadge,
  MaintenanceStatusBadge,
  PreventiveHealthBadge,
  PriorityBadge,
  SectorBadge,
  SeverityBadge,
}
