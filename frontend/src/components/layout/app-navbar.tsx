'use client'

import { useRouter } from 'next/navigation'
import { Menu, Plus } from 'lucide-react'

import { GlobalSearch } from '@/components/layout/global-search'
import { NotificationsMenu } from '@/components/layout/notifications-menu'
import { useSidebar } from '@/components/layout/sidebar-context'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'
import { Button } from '@/components/ui/button'

interface AppNavbarProps {
  /** Sobrescreve o comportamento padrão de navegar para /preventivas?nova=1. */
  onNewPreventive?: () => void
}

export function AppNavbar({ onNewPreventive }: AppNavbarProps) {
  const router = useRouter()
  const { setMobileOpen } = useSidebar()

  function handleNewPreventive() {
    if (onNewPreventive) {
      onNewPreventive()
      return
    }
    router.push('/preventivas?nova=1')
  }

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        aria-label="Abrir menu de navegação"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <GlobalSearch className="min-w-0 max-w-md flex-1" />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <Button onClick={handleNewPreventive} aria-label="Nova preventiva">
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Nova Preventiva</span>
        </Button>

        <NotificationsMenu />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
