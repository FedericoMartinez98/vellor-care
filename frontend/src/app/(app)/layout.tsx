'use client'

import type { ReactNode } from 'react'

import { AppNavbar } from '@/components/layout/app-navbar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context'
import { cn } from '@/lib/utils'

/** Consome o contexto da sidebar para deslocar o conteúdo conforme ela recolhe. */
function AppFrame({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar />

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out',
          collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64',
        )}
      >
        <AppNavbar />

        <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
          <div className="mx-auto w-full max-w-[1600px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppFrame>{children}</AppFrame>
    </SidebarProvider>
  )
}
