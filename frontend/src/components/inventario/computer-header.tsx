'use client'

/**
 * Cabeçalho da ficha do equipamento: identidade, situação e ações rápidas.
 *
 * Faz o papel do `PageHeader` nesta tela — é ele quem carrega o único `<h1>`
 * da página e a trilha de navegação.
 */

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Laptop, Monitor, Pencil, Wrench } from 'lucide-react'

import { ComputerStatusBadge, PreventiveHealthBadge, SectorBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { formatDate, formatRelative } from '@/lib/format'
import { preventiveHealthOf } from '@/lib/status'
import type { Computer, PreventiveHealth, Sector } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface ComputerHeaderProps {
  computer: Computer
  sector?: Sector
}

/** Classes escritas por extenso: o Tailwind não detecta classe montada em template string. */
const HEALTH_TEXT: Record<PreventiveHealth, string> = {
  EM_DIA: 'text-success',
  PROXIMA: 'text-warning',
  ATRASADA: 'text-danger',
}

/** Notebooks seguem o padrão de hostname `...-NB-...` no parque da empresa. */
function isNotebook(hostname: string): boolean {
  return hostname.toUpperCase().includes('-NB-')
}

function Indicator({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 px-4 py-1 first:pl-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  )
}

function ComputerHeader({ computer, sector }: ComputerHeaderProps) {
  const router = useRouter()

  const DeviceIcon = isNotebook(computer.hostname) ? Laptop : Monitor
  const health = preventiveHealthOf(computer)

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Trilha de navegação">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <li>
            <Link href="/" className="focus-ring rounded-sm transition-colors hover:text-foreground">
              Início
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
            <Link
              href="/inventario"
              className="focus-ring rounded-sm transition-colors hover:text-foreground"
            >
              Inventário
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
            <span aria-current="page" className="text-foreground/70 tabular">
              {computer.assetTag}
            </span>
          </li>
        </ol>
      </nav>

      <div className="surface-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary-soft"
            >
              <DeviceIcon className="size-7 text-primary" />
            </span>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {computer.assetTag} · {computer.hostname}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {computer.model} — {computer.manufacturer}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <ComputerStatusBadge status={computer.status} />
              <PreventiveHealthBadge health={health} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push(`/inventario?editar=${computer.id}`)}
              >
                <Pencil aria-hidden="true" className="size-4" />
                Editar
              </Button>

              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => router.push(`/preventivas?nova=1&computerId=${computer.id}`)}
              >
                <Wrench aria-hidden="true" className="size-4" />
                Iniciar manutenção
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap divide-x divide-border border-t border-border pt-4">
          <Indicator label="Responsável">
            <span className="block truncate">{computer.assignment.employeeName}</span>
          </Indicator>

          <Indicator label="Setor">
            <SectorBadge sector={sector} />
          </Indicator>

          <Indicator label="Última manutenção">
            {computer.lastMaintenanceAt ? (
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="tabular">{formatDate(computer.lastMaintenanceAt)}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {formatRelative(computer.lastMaintenanceAt)}
                </span>
              </span>
            ) : (
              <span className="font-normal text-muted-foreground">Nunca realizada</span>
            )}
          </Indicator>

          <Indicator label="Próxima manutenção">
            {computer.nextMaintenanceAt ? (
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className={cn('tabular', HEALTH_TEXT[health])}>
                  {formatDate(computer.nextMaintenanceAt)}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {formatRelative(computer.nextMaintenanceAt)}
                </span>
              </span>
            ) : (
              <span className={cn('font-normal', HEALTH_TEXT.ATRASADA)}>Sem agendamento</span>
            )}
          </Indicator>
        </div>
      </div>
    </div>
  )
}

export { ComputerHeader }
