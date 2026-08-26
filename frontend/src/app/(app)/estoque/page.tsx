import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PartsView } from '@/components/estoque/parts-view'

export const metadata: Metadata = {
  title: 'Estoque de Peças e Insumos',
  description: 'Controle de saldo, itens de reposição e movimentações auditáveis.',
}

export default function EstoquePage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <PartsView />
    </Suspense>
  )
}
