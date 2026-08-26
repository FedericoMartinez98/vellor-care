import type { Metadata } from 'next'

import { ImportTelemetryView } from '@/components/telemetria/import-telemetry-view'

export const metadata: Metadata = {
  title: 'Importar Telemetria',
  description: 'Importação em lote de telemetria via .csv do coletor Windows.',
}

export default function ImportarTelemetriaPage() {
  return <ImportTelemetryView />
}
