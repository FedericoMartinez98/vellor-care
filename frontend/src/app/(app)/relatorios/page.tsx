import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ReportsView } from '@/components/relatorios/reports-view'

export const metadata: Metadata = {
  title: 'Central de Relatórios',
  description: 'Geração e exportação de relatórios de inventário, preventivas e peças.',
}

export default function RelatoriosPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <ReportsView />
    </Suspense>
  )
}
