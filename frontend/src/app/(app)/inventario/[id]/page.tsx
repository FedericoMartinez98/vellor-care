import type { Metadata } from 'next'

import { ComputerDetail } from '@/components/inventario/computer-detail'

export const metadata: Metadata = { title: 'Ficha do equipamento' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <ComputerDetail computerId={id} />
}
