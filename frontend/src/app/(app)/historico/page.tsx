import type { Metadata } from 'next'
import { Suspense } from 'react'

import { HistoryView } from '@/components/historico/history-view'

export const metadata: Metadata = {
  title: 'Histórico de Atendimentos',
  description: 'Consulta a manutenções anteriores, peças trocadas e relatórios de execução.',
}

export default function HistoricoPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <HistoryView />
    </Suspense>
  )
}
