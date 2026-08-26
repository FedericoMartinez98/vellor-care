import type { Metadata } from 'next'
import { Suspense } from 'react'

import { InventoryView } from '@/components/inventario/inventory-view'

export const metadata: Metadata = {
  title: 'Inventário de Ativos',
  description: 'Gestão de computadores, configurações de hardware e responsáveis.',
}

export default function InventarioPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <InventoryView />
    </Suspense>
  )
}
