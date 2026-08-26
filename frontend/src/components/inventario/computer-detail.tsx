'use client'

/**
 * Ficha detalhada do equipamento: reúne cabeçalho, visão geral, histórico/timeline,
 * telemetria/saúde do hardware e etiqueta patrimonial com QR Code.
 */

import * as React from 'react'
import Link from 'next/link'
import { Activity, ArrowLeft, FileText, History, MonitorSmartphone, QrCode } from 'lucide-react'

import { ComputerHeader } from '@/components/inventario/computer-header'
import { ComputerHealthTab } from '@/components/inventario/computer-health-tab'
import { ComputerLabelTab } from '@/components/inventario/computer-label-tab'
import { ComputerOverview } from '@/components/inventario/computer-overview'
import { ComputerTimeline } from '@/components/inventario/computer-timeline'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useVellor } from '@/lib/store'

export interface ComputerDetailProps {
  computerId: string
}

export function ComputerDetail({ computerId }: ComputerDetailProps) {
  const { ready, getComputer, getSector } = useVellor()

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-10 w-96 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  const computer = getComputer(computerId)

  if (!computer) {
    return (
      <div className="surface-card p-12">
        <EmptyState
          icon={MonitorSmartphone}
          title="Equipamento não encontrado"
          description="O computador solicitado não consta na base de dados ou foi desativado/removido."
          action={
            <Button asChild variant="outline">
              <Link href="/inventario">
                <ArrowLeft className="mr-2 size-4" />
                Voltar ao Inventário
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  const sector = getSector(computer.assignment.sectorId)

  return (
    <div className="flex flex-col gap-6">
      <ComputerHeader computer={computer} sector={sector} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="gap-2">
            <FileText className="size-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <History className="size-4" />
            Histórico & Manutenções
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Activity className="size-4" />
            Saúde & Telemetria
          </TabsTrigger>
          <TabsTrigger value="label" className="gap-2">
            <QrCode className="size-4" />
            Etiqueta & QR Code
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="m-0 focus-visible:outline-none">
            <ComputerOverview computer={computer} sector={sector} />
          </TabsContent>

          <TabsContent value="timeline" className="m-0 focus-visible:outline-none">
            <ComputerTimeline computerId={computer.id} />
          </TabsContent>

          <TabsContent value="health" className="m-0 focus-visible:outline-none">
            <ComputerHealthTab computer={computer} />
          </TabsContent>

          <TabsContent value="label" className="m-0 focus-visible:outline-none">
            <ComputerLabelTab computer={computer} sector={sector} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
