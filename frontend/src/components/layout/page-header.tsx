import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface PageHeaderCrumb {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: PageHeaderCrumb[]
  actions?: ReactNode
  icon?: LucideIcon
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  icon: Icon,
  className,
}: PageHeaderProps) {
  const hasCrumbs = Boolean(breadcrumbs && breadcrumbs.length > 0)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {hasCrumbs && breadcrumbs ? (
        <nav aria-label="Trilha de navegação">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1

              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? (
                    <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : null}

                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="focus-ring rounded-sm transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={isLast ? 'page' : undefined} className="text-foreground/70">
                      {crumb.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft"
            >
              <Icon className="size-5 text-primary" />
            </span>
          ) : null}

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
