import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PreventivesView } from '@/components/preventivas/preventives-view'

export const metadata: Metadata = {
  title: 'Preventivas',
}

export default function PreventivasPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <PreventivesView />
    </Suspense>
  )
}
