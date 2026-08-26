'use client'

import type { ReactNode } from 'react'
import * as React from 'react'
import { useRouter } from 'next/navigation'

import { AppNavbar } from '@/components/layout/app-navbar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context'
import { Skeleton } from '@/components/ui/skeleton'
import { isRemoteBackend } from '@/lib/api'
import { useRealAuth } from '@/lib/hooks/use-real-auth'
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

/**
 * Sem isso, qualquer um digitando a URL direto (ex: /inventario) via a
 * tela renderizar antes de qualquer 401 da API acontecer -- o guard de
 * rota simplesmente não existia (confirmado lendo o código: nenhum
 * middleware.ts, nenhum layout aqui fazia essa checagem).
 */
function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const remote = isRemoteBackend()
  const { ready, isAuthenticated } = useRealAuth()

  React.useEffect(() => {
    if (remote && ready && !isAuthenticated) {
      router.replace('/login')
    }
  }, [remote, ready, isAuthenticated, router])

  if (remote && (!ready || !isAuthenticated)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  return <>{children}</>
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppFrame>{children}</AppFrame>
      </SidebarProvider>
    </AuthGuard>
  )
}
