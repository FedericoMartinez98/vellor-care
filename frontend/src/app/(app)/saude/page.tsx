import type { Metadata } from 'next'
import { Suspense } from 'react'

import { HealthDashboardView } from '@/components/saude/health-dashboard-view'

export const metadata: Metadata = {
  title: 'Saúde e Telemetria',
  description: 'Monitoramento de componentes de hardware, temperaturas e indicadores SMART.',
}

export default function SaudePage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <HealthDashboardView />
    </Suspense>
  )
}
