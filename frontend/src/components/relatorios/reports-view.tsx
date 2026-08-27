'use client'

/**
 * Módulo de Relatórios e Exportações Gerenciais:
 * - 5 modelos de relatórios corporativos pré-configurados
 * - Filtros por período, setor, técnico e tipo de serviço
 * - Exportação instantânea em PDF, Excel (.xlsx) e CSV
 */

import * as React from 'react'
import {
  BarChart3,
  Calendar,
  Download,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Package,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  exportComputersCsv,
  exportComputersPdf,
  exportComputersXlsx,
  exportMaintenancesCsv,
  exportMaintenancesPdf,
  exportMaintenancesXlsx,
  exportPartsCsv,
  exportPartsPdf,
  exportPartsXlsx,
} from '@/lib/export'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { isRemoteBackend } from '@/lib/api'
import { useRealDatabase } from '@/lib/hooks/use-real-database'
import { useVellor } from '@/lib/store'
import { cn } from '@/lib/utils'

type ReportType =
  | 'PREVENTIVAS_PERIODO'
  | 'COMPUTADORES_SETOR'
  | 'HISTORICO_EQUIPAMENTO'
  | 'PECAS_UTILIZADAS'
  | 'PRODUTIVIDADE_TECNICOS'

interface ReportMeta {
  id: ReportType
  title: string
  description: string
  icon: React.ElementType
}

const REPORT_CATALOG: ReportMeta[] = [
  {
    id: 'PREVENTIVAS_PERIODO',
    title: 'Preventivas por Período',
    description: 'Ordens agendadas, concluídas e atrasadas em um intervalo de datas.',
    icon: Calendar,
  },
  {
    id: 'COMPUTADORES_SETOR',
    title: 'Computadores por Setor',
    description: 'Inventário agrupado por departamento, unidades e índice de conformidade.',
    icon: Layers,
  },
  {
    id: 'HISTORICO_EQUIPAMENTO',
    title: 'Histórico de Equipamento',
    description: 'Trilha completa de manutenções, peças e custos de um ativo específico.',
    icon: FileText,
  },
  {
    id: 'PECAS_UTILIZADAS',
    title: 'Peças Utilizadas e Custos',
    description: 'Consumo de peças nas preventivas, saídas de estoque e valor financeiro.',
    icon: Package,
  },
  {
    id: 'PRODUTIVIDADE_TECNICOS',
    title: 'Produtividade dos Técnicos',
    description: 'Total de preventivas executadas por técnico e tempo médio de bancada.',
    icon: UserCheck,
  },
]

export function ReportsView() {
  const mock = useVellor()
  const real = useRealDatabase()
  const remote = isRemoteBackend()

  const ready = remote ? real.ready : mock.ready
  const computers = remote ? real.db.computers : mock.computers
  const sectors = remote ? real.db.sectors : mock.sectors
  const maintenances = remote ? real.db.maintenances : mock.maintenances
  const parts = remote ? real.db.parts : mock.parts
  const technicians = remote
    ? real.db.users.filter((u) => u.role === 'TECNICO' || u.role === 'ADMINISTRADOR')
    : mock.technicians

  const [selectedReport, setSelectedReport] = React.useState<ReportType>('PREVENTIVAS_PERIODO')
  const [fromDate, setFromDate] = React.useState<string>(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  )
  const [toDate, setToDate] = React.useState<string>(new Date().toISOString().slice(0, 10))
  const [sectorFilter, setSectorFilter] = React.useState<string>('ALL')
  const [technicianFilter, setTechnicianFilter] = React.useState<string>('ALL')
  const [computerFilter, setComputerFilter] = React.useState<string>('ALL')

  // Filtra dados conforme seleção
  const filteredMaintenances = React.useMemo(() => {
    return maintenances.filter((m) => {
      // `finishedAt` é timestamp completo ("2026-08-27T13:03:59Z") e os
      // filtros são data pura ("2026-08-27"). Comparado como texto,
      // "2026-08-27T13:03:59Z" > "2026-08-27" -- então tudo que foi concluído
      // NO último dia do período era descartado do relatório. Compara só a data.
      const dt = (m.finishedAt ?? m.scheduledFor).slice(0, 10)
      if (dt < fromDate || dt > toDate) return false
      if (sectorFilter !== 'ALL' && m.sectorId !== sectorFilter) return false
      if (technicianFilter !== 'ALL' && m.technicianId !== technicianFilter) return false
      if (computerFilter !== 'ALL' && m.computerId !== computerFilter) return false
      return true
    })
  }, [maintenances, fromDate, toDate, sectorFilter, technicianFilter, computerFilter])

  // Exportação unificada
  function handleExport(format: 'pdf' | 'xlsx' | 'csv') {
    try {
      if (selectedReport === 'COMPUTADORES_SETOR') {
        const filteredComputers =
          sectorFilter === 'ALL'
            ? computers
            : computers.filter((c) => c.assignment.sectorId === sectorFilter)

        if (format === 'pdf') exportComputersPdf(filteredComputers, sectors)
        else if (format === 'xlsx') exportComputersXlsx(filteredComputers, sectors)
        else exportComputersCsv(filteredComputers, sectors)
      } else if (selectedReport === 'PECAS_UTILIZADAS') {
        if (format === 'pdf') exportPartsPdf(parts)
        else if (format === 'xlsx') exportPartsXlsx(parts)
        else exportPartsCsv(parts)
      } else {
        // PREVENTIVAS_PERIODO, HISTORICO_EQUIPAMENTO, PRODUTIVIDADE_TECNICOS
        if (format === 'pdf') exportMaintenancesPdf(filteredMaintenances)
        else if (format === 'xlsx') exportMaintenancesXlsx(filteredMaintenances)
        else exportMaintenancesCsv(filteredMaintenances)
      }

      toast.success(`Relatório exportado em ${format.toUpperCase()} com sucesso.`)
    } catch {
      toast.error('Erro ao gerar a exportação.')
    }
  }

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  const activeMeta = REPORT_CATALOG.find((r) => r.id === selectedReport)!
  const Icon = activeMeta.icon

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Central de Relatórios"
        description="Gere relatórios gerenciais, acompanhe métricas de produtividade e exporte dados auditáveis."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de Modelos de Relatório */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Modelos Disponíveis
          </p>
          <div className="space-y-2">
            {REPORT_CATALOG.map((rep) => {
              const RepIcon = rep.icon
              const isSelected = rep.id === selectedReport

              return (
                <button
                  type="button"
                  key={rep.id}
                  onClick={() => setSelectedReport(rep.id)}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary-soft/50 ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/40',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <RepIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{rep.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{rep.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtros e Pré-visualização do Relatório Selecionado */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <CardTitle>{activeMeta.title}</CardTitle>
                  <CardDescription>{activeMeta.description}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Filtros Parametrizados */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Filter className="size-3.5" />
                  Parâmetros de Filtro
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs">Data Inicial</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Data Final</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Setor</Label>
                    <Select value={sectorFilter} onValueChange={setSectorFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos os Setores</SelectItem>
                        {sectors.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Técnico Responsável</Label>
                    <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos os Técnicos</SelectItem>
                        {technicians.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedReport === 'HISTORICO_EQUIPAMENTO' ? (
                    <div>
                      <Label className="text-xs">Computador</Label>
                      <Select value={computerFilter} onValueChange={setComputerFilter}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Todos</SelectItem>
                          {computers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.assetTag} ({c.hostname})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Resumo da Consulta */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground uppercase">Registros Encontrados</p>
                  <p className="mt-1 text-2xl font-bold tabular">
                    {selectedReport === 'COMPUTADORES_SETOR'
                      ? formatNumber(computers.length)
                      : selectedReport === 'PECAS_UTILIZADAS'
                        ? formatNumber(parts.length)
                        : formatNumber(filteredMaintenances.length)}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground uppercase">Período Selecionado</p>
                  <p className="mt-1 text-sm font-semibold tabular">
                    {formatDate(fromDate)} até {formatDate(toDate)}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground uppercase">Status do Relatório</p>
                  <p className="mt-1 text-sm font-semibold text-success">Pronto para exportar</p>
                </div>
              </div>

              {/* Botões de Exportação */}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                <Button variant="outline" onClick={() => handleExport('csv')}>
                  <Download className="mr-2 size-4" />
                  Exportar CSV
                </Button>
                <Button variant="outline" onClick={() => handleExport('xlsx')}>
                  <FileSpreadsheet className="mr-2 size-4" />
                  Exportar Excel (.xlsx)
                </Button>
                <Button onClick={() => handleExport('pdf')}>
                  <FileText className="mr-2 size-4" />
                  Exportar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
