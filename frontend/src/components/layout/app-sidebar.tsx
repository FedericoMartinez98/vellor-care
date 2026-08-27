'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react'

import { useSidebar } from '@/components/layout/sidebar-context'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NAV_ITEMS, type NavItem } from '@/lib/constants'
import { preventiveHealthOf } from '@/lib/status'
import { isRemoteBackend } from '@/lib/api'
import { useRealInventory } from '@/lib/hooks/use-real-inventory'
import { useVellor } from '@/lib/store'
import { cn } from '@/lib/utils'

const APP_VERSION = 'v1.0.0'

function isActiveRoute(pathname: string, href: string): boolean {
  if (pathname === href) return true
  return href !== '/' && pathname.startsWith(href)
}

// ============================================================================
// Marca
// ============================================================================

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Vellor Care — ir para o dashboard"
      className={cn(
        'focus-ring flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4',
        collapsed && 'justify-center px-0',
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary"
      >
        <ShieldCheck className="size-5 text-sidebar-primary-foreground" />
      </span>

      {!collapsed ? (
        <span className="truncate text-base leading-none tracking-tight">
          <span className="font-semibold">Vellor</span>{' '}
          <span className="font-semibold text-sidebar-primary">Care</span>
        </span>
      ) : null}
    </Link>
  )
}

// ============================================================================
// Item de navegação
// ============================================================================

interface SidebarNavLinkProps {
  item: NavItem
  active: boolean
  collapsed: boolean
  count: number
  onNavigate?: () => void
}

function SidebarNavLink({ item, active, collapsed, count, onNavigate }: SidebarNavLinkProps) {
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-ring relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors',
        collapsed ? 'justify-center px-0' : 'px-3',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60',
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-sidebar-primary"
        />
      ) : null}

      <Icon className="size-[18px] shrink-0" aria-hidden="true" />

      {collapsed ? (
        <>
          <span className="sr-only">{item.label}</span>
          {count > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger"
            />
          ) : null}
        </>
      ) : (
        <>
          <span className="truncate">{item.label}</span>
          {count > 0 ? (
            <Badge variant="danger" className="ml-auto tabular">
              {count}
            </Badge>
          ) : null}
        </>
      )}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {count > 0 ? `${item.label} · ${count} atrasada(s)` : item.label}
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// Corpo compartilhado (desktop fixo e drawer mobile)
// ============================================================================

interface SidebarBodyProps {
  collapsed: boolean
  overdueCount: number
  showCollapseToggle: boolean
  onNavigate?: () => void
}

function SidebarBody({
  collapsed,
  overdueCount,
  showCollapseToggle,
  onNavigate,
}: SidebarBodyProps) {
  const pathname = usePathname()
  const { toggleCollapsed } = useSidebar()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarBrand collapsed={collapsed} />

      <nav
        aria-label="Navegação principal"
        className={cn('min-h-0 flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}
      >
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <SidebarNavLink
                item={item}
                active={isActiveRoute(pathname, item.href)}
                collapsed={collapsed}
                count={item.module === 'preventivas' ? overdueCount : 0}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div
        className={cn(
          'shrink-0 border-t border-sidebar-border py-3',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        {showCollapseToggle ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className={cn(
              'focus-ring flex w-full items-center gap-3 rounded-lg py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              collapsed ? 'justify-center px-0' : 'px-3',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px] shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-[18px] shrink-0" aria-hidden="true" />
            )}
            {!collapsed ? <span className="truncate">Recolher menu</span> : null}
          </button>
        ) : null}

        <p
          className={cn(
            'mt-2 text-[11px] text-sidebar-foreground/45 tabular',
            collapsed ? 'text-center' : 'px-3',
          )}
        >
          {APP_VERSION}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Sidebar
// ============================================================================

export function AppSidebar() {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar()
  const mock = useVellor()
  const real = useRealInventory()
  const remote = isRemoteBackend()
  const ready = remote ? real.ready : mock.ready
  const computers = remote ? real.computers : mock.computers

  // Contagem só depois da hidratação: no servidor não há base persistida para comparar.
  const overdueCount = useMemo(() => {
    if (!ready) return 0
    return computers.filter((computer) => preventiveHealthOf(computer) === 'ATRASADA').length
  }, [ready, computers])

  return (
    <>
      <aside
        data-collapsed={collapsed ? '' : undefined}
        className={cn(
          'no-print fixed inset-y-0 left-0 z-40 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-[4.5rem]' : 'w-64',
        )}
      >
        <SidebarBody collapsed={collapsed} overdueCount={overdueCount} showCollapseToggle />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground lg:hidden"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarBody
            collapsed={false}
            overdueCount={overdueCount}
            showCollapseToggle={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
