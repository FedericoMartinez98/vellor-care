'use client'

/**
 * Painel Global de Saúde do Parque de Máquinas:
 * - Monitoramento de telemetria WMI e coletas manuais
 * - Identificação de anomalias térmicas e degradação de SSDs
 * - Semáforo de criticidade de hardware
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Radio,
  Server,
  Thermometer,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import {
  DataTable,
  DataTableColumnHeader,
  SectorBadge,
  StatCard,
  type DataTableFacet,
} from '@/components/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CRITICAL_SSD_HEALTH_PERCENT,
  CRITICAL_TEMP_C,
  LOW_DISK_FREE_PERCENT,
} from '@/lib/constants'
import { formatBytesGb, formatDate, formatPercent, formatRelative } from '@/lib/format'
import { computerIsCritical, criticalReasons } from '@/lib/status'
import { isRemoteBackend } from '@/lib/api'
import { useRealInventory } from '@/lib/hooks/use-real-inventory'
import { useVellor } from '@/lib/store'
import type { Computer } from '@/lib/types'

export function HealthDashboardView() {
  const router = useRouter()
  const mock = useVellor()
  const real = useRealInventory()
  const remote = isRemoteBackend()
  const ready = remote ? real.ready : mock.ready
  const computers = remote ? real.computers : mock.computers
  const sectors = remote ? real.sectors : mock.sectors

  // Análise global de saúde
  const stats = React.useMemo(() => {
    let ssdCritical = 0
    let tempCritical = 0
    let diskLow = 0
    let agentSources = 0
    let manualSources = 0

    computers.forEach((c) => {
      const h = c.health
      if (h) {
        if (h.ssdHealthPercent < CRITICAL_SSD_HEALTH_PERCENT) ssdCritical++
        if (h.cpuTempC >= CRITICAL_TEMP_C || h.ssdTempC >= 70) tempCritical++
        if (h.diskFreePercent <= LOW_DISK_FREE_PERCENT) diskLow++
        if (h.source === 'AGENTE') agentSources++
        else manualSources++
      }
    })

    const criticalComputers = computers.filter((c) => computerIsCritical(c))

    return {
      total: computers.length,
      criticalCount: criticalComputers.length,
      ssdCritical,
      tempCritical,
      diskLow,
      agentSources,
      manualSources,
      criticalComputers,
    }
  }, [computers])

  const facets = React.useMemo<DataTableFacet[]>(() => {
    return [
      {
        columnId: 'sectorId',
        title: 'Setor',
        options: sectors.map((s) => ({ label: s.name, value: s.id })),
      },
    ]
  }, [sectors])

  const columns = React.useMemo<ColumnDef<Computer>[]>(() => {
    return [
      {
        accessorKey: 'assetTag',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Patrimônio" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold tabular text-foreground">{row.original.assetTag}</span>
            <span className="text-xs text-muted-foreground">{row.original.hostname}</span>
          </div>
        ),
      },
      {
        id: 'employeeName',
        accessorFn: (row) => row.assignment.employeeName,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Responsável" />,
        cell: ({ row }) => (
          <div className="flex flex-col text-sm">
            <span className="font-medium">{row.original.assignment.employeeName}</span>
            <span className="text-xs text-muted-foreground">{row.original.assignment.unit}</span>
          </div>
        ),
      },
      {
        id: 'sectorId',
        accessorFn: (row) => row.assignment.sectorId,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Setor" />,
        cell: ({ row }) => {
          const sector = sectors.find((s) => s.id === row.original.assignment.sectorId)
          return <SectorBadge sector={sector} />
        },
      },
      {
        id: 'ssdHealth',
        accessorFn: (row) => row.health?.ssdHealthPercent ?? 100,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Saúde SSD" />,
        cell: ({ row }) => {
          const val = row.original.health?.ssdHealthPercent
          if (val === undefined) return <span className="text-xs text-muted-foreground">—</span>
          const isCrit = val < CRITICAL_SSD_HEALTH_PERCENT
          return (
            <Badge variant={isCrit ? 'danger' : val < 50 ? 'warning' : 'success'} className="tabular">
              {formatPercent(val)}
            </Badge>
          )
        },
      },
      {
        id: 'cpuTemp',
        accessorFn: (row) => row.health?.cpuTempC ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Temp. CPU" />,
        cell: ({ row }) => {
          const val = row.original.health?.cpuTempC
          if (val === undefined) return <span className="text-xs text-muted-foreground">—</span>
          const isCrit = val >= CRITICAL_TEMP_C
          return (
            <span className={`tabular font-medium text-xs ${isCrit ? 'text-danger font-bold' : val > 75 ? 'text-warning' : 'text-foreground'}`}>
              {val} °C
            </span>
          )
        },
      },
      {
        id: 'diskFree',
        accessorFn: (row) => row.health?.diskFreePercent ?? 100,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Espaço Livre" />,
        cell: ({ row }) => {
          const val = row.original.health?.diskFreePercent
          const gb = row.original.health?.diskFreeGb
          if (val === undefined) return <span className="text-xs text-muted-foreground">—</span>
          const isLow = val <= LOW_DISK_FREE_PERCENT
          return (
            <div className="flex flex-col text-xs">
              <span className={`tabular font-medium ${isLow ? 'text-danger' : 'text-foreground'}`}>
                {formatPercent(val)}
              </span>
              {gb !== undefined ? (
                <span className="text-muted-foreground">{formatBytesGb(gb)} livres</span>
              ) : null}
            </div>
          )
        },
      },
      {
        id: 'source',
        accessorFn: (row) => row.health?.source ?? 'MANUAL',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Origem" />,
        cell: ({ row }) => {
          const source = row.original.health?.source
          if (!source) return <span className="text-xs text-muted-foreground">Sem dados</span>
          return (
            <Badge variant={source === 'AGENTE' ? 'info' : 'outline'}>
              {source === 'AGENTE' ? 'Agente' : 'Manual'}
            </Badge>
          )
        },
      },
      {
        id: 'collectedAt',
        accessorFn: (row) => row.health?.collectedAt ?? '',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Última Coleta" />,
        cell: ({ row }) => {
          const dt = row.original.health?.collectedAt
          if (!dt) return <span className="text-xs text-muted-foreground">—</span>
          return (
            <span className="tabular text-xs text-muted-foreground">{formatRelative(dt)}</span>
          )
        },
      },
    ]
  }, [sectors])

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Painel de Saúde e Telemetria"
        description="Monitoramento proativo de hardware, alertas de degradação de componentes e coletas automáticas."
      />

      {/* Alerta de Máquinas em Estado Crítico */}
      {stats.criticalCount > 0 ? (
        <Alert variant="destructive">
          <AlertOctagon aria-hidden="true" />
          <AlertTitle className="font-semibold">
            {stats.criticalCount} {stats.criticalCount === 1 ? 'computador requer atenção imediata' : 'computadores requerem atenção imediata'}
          </AlertTitle>
          <AlertDescription>
            Foram detectados componentes com indicadores fora da faixa de segurança (SMART abaixo de 20%, superaquecimento ou espaço livre crítico).
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Grid de Estatísticas Rápidas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="SSDs em Risco (< 20%)"
          value={stats.ssdCritical}
          icon={HardDrive}
          tone={stats.ssdCritical > 0 ? 'danger' : 'success'}
          hint="Risco iminente de perda de dados"
        />
        <StatCard
          label="Superaquecimento (> 85°C)"
          value={stats.tempCritical}
          icon={Thermometer}
          tone={stats.tempCritical > 0 ? 'warning' : 'success'}
          hint="Verificar cooler e pasta térmica"
        />
        <StatCard
          label="Disco Quase Cheio (< 15%)"
          value={stats.diskLow}
          icon={AlertTriangle}
          tone={stats.diskLow > 0 ? 'warning' : 'default'}
          hint="Limpeza de arquivos recomendada"
        />
        <StatCard
          label="Estações com Agente Ativo"
          value={stats.agentSources}
          icon={Radio}
          tone="info"
          hint="Telemetria contínua via WMI"
        />
      </div>

      {/* Tabela TanStack de Saúde */}
      <DataTable<Computer, unknown>
        columns={columns}
        data={computers}
        searchPlaceholder="Buscar por patrimônio ou responsável..."
        onRowClick={(row: Computer) => router.push(`/inventario/${row.id}?aba=saude`)}
        facets={facets}
      />
    </div>
  )
}
