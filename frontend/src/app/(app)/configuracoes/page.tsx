import type { Metadata } from 'next'
import { Suspense } from 'react'

import { SettingsView } from '@/components/configuracoes/settings-view'

export const metadata: Metadata = {
  title: 'Configurações',
  description: 'Gestão de usuários, permissões, rotinas de backup e parâmetros do sistema.',
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <SettingsView />
    </Suspense>
  )
}
