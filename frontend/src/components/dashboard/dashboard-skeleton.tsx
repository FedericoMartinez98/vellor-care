'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Bloco de gráfico: cabeçalho + área de plotagem. */
function ChartCardSkeleton({ height, className }: { height: number; className?: string }) {
  return (
    <Card className={cn('gap-4 p-6', className)}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </Card>
  )
}

/** Bloco de lista: cabeçalho + linhas com avatar, texto e etiqueta. */
function ListCardSkeleton({ rows, className }: { rows: number; className?: string }) {
  return (
    <Card className={cn('gap-4 p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * Espelha a malha do dashboard enquanto o store hidrata do `localStorage`,
 * evitando que a tela “pule” quando `ready` vira `true`.
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando indicadores do dashboard…</span>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} className="gap-0 p-5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-9 shrink-0 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-9 w-24" />
            <Skeleton className="mt-2 h-3.5 w-28" />
          </Card>
        ))}
      </div>

      <Card className="gap-0 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-4 sm:w-72 sm:shrink-0">
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <div className="flex flex-1 items-center gap-4">
            <Skeleton className="h-2.5 flex-1 rounded-full" />
            <Skeleton className="h-9 w-20 shrink-0" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCardSkeleton height={280} className="lg:col-span-2" />
        <ChartCardSkeleton height={280} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height={320} />
        <ChartCardSkeleton height={260} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ListCardSkeleton rows={5} className="lg:col-span-3" />
        <ListCardSkeleton rows={4} className="lg:col-span-2" />
      </div>
    </div>
  )
}

export { DashboardSkeleton }
