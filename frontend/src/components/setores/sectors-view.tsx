'use client'

/**
 * Visão Geral de Setores e Conformidade de Preventivas:
 * - Cartões de índice de conformidade por setor
 * - Alocação de ativos e responsáveis
 * - Gestão e criação de novos setores
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CheckCircle2,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import { SectorFormDialog } from '@/components/setores/sector-form-dialog'
import { ConfirmDialog, StatCard } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatPercent } from '@/lib/format'
import { preventiveHealthOf } from '@/lib/status'
import { isRemoteBackend } from '@/lib/api'
import { useRealInventory } from '@/lib/hooks/use-real-inventory'
import { useVellor } from '@/lib/store'
import type { Sector } from '@/lib/types'

export function SectorsView() {
  const router = useRouter()
  const mock = useVellor()
  const real = useRealInventory()
  const remote = isRemoteBackend()

  const { deleteSector } = mock
  const ready = remote ? real.ready : mock.ready
  const sectors = remote ? real.sectors : mock.sectors
  const computers = remote ? real.computers : mock.computers

  const [formOpen, setFormOpen] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [selectedSector, setSelectedSector] = React.useState<Sector | undefined>()
  const [sectorToDelete, setSectorToDelete] = React.useState<Sector | undefined>()

  // Métricas agregadas por setor
  const sectorMetrics = React.useMemo(() => {
    return sectors.map((sector) => {
      const sectorComputers = computers.filter((c) => c.assignment.sectorId === sector.id)
      const total = sectorComputers.length
      const active = sectorComputers.filter((c) => c.status === 'ATIVO').length
      const overdue = sectorComputers.filter((c) => preventiveHealthOf(c) === 'ATRASADA').length
      const onSchedule = sectorComputers.filter((c) => preventiveHealthOf(c) === 'EM_DIA').length
      const compliance = total > 0 ? Math.round((onSchedule / total) * 100) : 100

      return {
        sector,
        total,
        active,
        overdue,
        onSchedule,
        compliance,
      }
    })
  }, [sectors, computers])

  // Estatísticas globais
  const stats = React.useMemo(() => {
    const totalSectors = sectors.length
    const totalComputers = computers.length
    const perfectSectors = sectorMetrics.filter((m) => m.compliance === 100).length
    const avgCompliance =
      sectorMetrics.length > 0
        ? Math.round(sectorMetrics.reduce((acc, m) => acc + m.compliance, 0) / sectorMetrics.length)
        : 100

    return { totalSectors, totalComputers, perfectSectors, avgCompliance }
  }, [sectors, computers, sectorMetrics])

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Setores da Empresa"
        description="Acompanhamento da distribuição do parque de máquinas e índice de conformidade de preventivas."
        actions={
          <Button
            onClick={() => {
              setSelectedSector(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-2 size-4" />
            Novo Setor
          </Button>
        }
      />

      {/* Estatísticas Rápidas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de Setores"
          value={stats.totalSectors}
          icon={Building2}
          hint="Unidades e departamentos"
        />
        <StatCard
          label="Total de Equipamentos"
          value={stats.totalComputers}
          icon={Users}
          hint="Alocados nos setores"
        />
        <StatCard
          label="Setores 100% em Dia"
          value={stats.perfectSectors}
          icon={ShieldCheck}
          tone="success"
          hint="Sem nenhuma preventiva atrasada"
        />
        <StatCard
          label="Conformidade Média"
          value={formatPercent(stats.avgCompliance)}
          icon={CheckCircle2}
          tone={stats.avgCompliance >= 85 ? 'success' : stats.avgCompliance >= 60 ? 'warning' : 'danger'}
          hint="Índice geral de preventivas"
        />
      </div>

      {/* Grid de Cartões de Setor */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sectorMetrics.map(({ sector, total, active, overdue, compliance }) => {
          const complianceTone =
            compliance >= 90 ? 'bg-success' : compliance >= 60 ? 'bg-warning' : 'bg-danger'

          return (
            <div
              key={sector.id}
              className="surface-card flex flex-col justify-between p-5 transition-all hover:border-primary/40"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: sector.color }}
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="font-semibold text-foreground">{sector.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {sector.code} · {sector.unit}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/inventario?setor=${sector.id}`)}
                      >
                        <FolderOpen className="mr-2 size-4" />
                        Ver computadores
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedSector(sector)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-danger"
                        onClick={() => {
                          setSectorToDelete(sector)
                          setDeleteConfirmOpen(true)
                        }}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/20 p-2.5 text-center">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                    <p className="font-semibold tabular text-foreground">{formatNumber(total)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Ativos</p>
                    <p className="font-semibold tabular text-foreground">{formatNumber(active)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Atrasadas</p>
                    <p className={`font-semibold tabular ${overdue > 0 ? 'text-danger' : 'text-success'}`}>
                      {formatNumber(overdue)}
                    </p>
                  </div>
                </div>

                {sector.manager || sector.costCenter ? (
                  <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                    {sector.manager ? <p><strong>Gestor:</strong> {sector.manager}</p> : null}
                    {sector.costCenter ? <p><strong>Centro de Custo:</strong> {sector.costCenter}</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Conformidade de Preventivas</span>
                  <span className="font-semibold tabular text-foreground">{compliance}%</span>
                </div>
                <Progress
                  value={compliance}
                  indicatorClassName={complianceTone}
                  aria-label={`Conformidade de ${sector.name}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialogs */}
      <SectorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sectorToEdit={selectedSector}
      />

      {sectorToDelete ? (
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={`Excluir o setor ${sectorToDelete.name}?`}
          description="Os computadores alocados neste setor não serão excluídos, mas ficarão sem vínculo departamental."
          confirmLabel="Excluir Setor"
          destructive
          onConfirm={() => {
            deleteSector(sectorToDelete.id)
            toast.success(`Setor ${sectorToDelete.name} excluído.`)
          }}
        />
      ) : null}
    </div>
  )
}
