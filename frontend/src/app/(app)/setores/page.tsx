import type { Metadata } from 'next'
import { Suspense } from 'react'

import { SectorsView } from '@/components/setores/sectors-view'

export const metadata: Metadata = {
  title: 'Setores e Conformidade',
  description: 'Gestão departamental e acompanhamento do índice de preventivas por setor.',
}

export default function SetoresPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <SectorsView />
    </Suspense>
  )
}
