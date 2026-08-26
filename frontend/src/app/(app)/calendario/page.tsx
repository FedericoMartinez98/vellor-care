import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CalendarView } from '@/components/calendario/calendar-view'

export const metadata: Metadata = {
  title: 'Calendário de Preventivas',
  description: 'Cronograma operacional e agendamento de manutenções.',
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <CalendarView />
    </Suspense>
  )
}
