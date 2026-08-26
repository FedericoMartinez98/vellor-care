'use client'

/**
 * Calendário de Manutenções Preventivas e Agendamentos:
 * - Visão mensal com grade de dias
 * - Indicadores visuais de carga de trabalho e ordens atrasadas
 * - Reagendamento rápido e abertura de execução
 */

import * as React from 'react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Plus,
  Wrench,
} from 'lucide-react'

import { MaintenanceDetailDialog } from '@/components/inventario/maintenance-detail-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { PreventiveExecutionDialog } from '@/components/preventivas/preventive-execution-dialog'
import { RescheduleDialog } from '@/components/preventivas/reschedule-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { MAINTENANCE_TYPE_LABELS } from '@/lib/constants'
import { parseISODate } from '@/lib/format'
import { effectiveMaintenanceStatus } from '@/lib/status'
import { useVellor } from '@/lib/store'
import type { Maintenance } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CalendarView() {
  const { ready, maintenances, sectors, getComputer } = useVellor()
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [sectorFilter, setSectorFilter] = React.useState<string>('ALL')

  const [detailOpen, setDetailOpen] = React.useState(false)
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false)
  const [executionOpen, setExecutionOpen] = React.useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = React.useState<Maintenance | undefined>()

  // Gera a grade de 35 ou 42 dias para o mês
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  // Filtra manutenções
  const filteredMaintenances = React.useMemo(() => {
    return maintenances.filter((m) => {
      if (sectorFilter !== 'ALL' && m.sectorId !== sectorFilter) return false
      return true
    })
  }, [maintenances, sectorFilter])

  // Mapeia manutenções por data ISO (YYYY-MM-DD)
  const maintenancesByDate = React.useMemo(() => {
    const map = new Map<string, Maintenance[]>()
    filteredMaintenances.forEach((m) => {
      const dateKey = m.scheduledFor
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(m)
    })
    return map
  }, [filteredMaintenances])

  // Manutenções do dia selecionado
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
  const dayMaintenances = maintenancesByDate.get(selectedDateKey) ?? []

  function prevMonth() {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }

  function nextMonth() {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }

  function goToToday() {
    const now = new Date()
    setCurrentMonth(now)
    setSelectedDate(now)
  }

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendário de Preventivas"
        description="Cronograma operacional de atendimentos técnicos, agendamentos e manutenções programadas."
        actions={
          <div className="flex items-center gap-2">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-44">
                <Filter className="mr-2 size-3.5" />
                <SelectValue placeholder="Filtrar Setor" />
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

            <Button
              onClick={() => {
                setSelectedMaintenance(undefined)
                setExecutionOpen(true)
              }}
            >
              <Plus className="mr-2 size-4" />
              Nova Manutenção
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Painel do Calendário (Mês) */}
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <div className="flex items-center">
                <Button variant="ghost" size="icon-sm" onClick={prevMonth} aria-label="Mês anterior">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={nextMonth} aria-label="Próximo mês">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <h2 className="text-base font-semibold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-success" /> Em dia
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-warning" /> Agendada
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-danger" /> Atrasada
              </div>
            </div>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 border-y border-border text-center text-xs font-semibold text-muted-foreground">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="py-2.5">
                {day}
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border border-b border-border">
            {calendarDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayItems = maintenancesByDate.get(dayKey) ?? []
              const isSelected = isSameDay(day, selectedDate)
              const isCurrMonth = isSameMonth(day, currentMonth)
              const isCurrentDay = isToday(day)

              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'group relative flex min-h-24 flex-col p-1.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none',
                    !isCurrMonth && 'bg-muted/10 text-muted-foreground/40',
                    isSelected && 'bg-primary-soft/40 ring-1 ring-primary/40 ring-inset',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs font-medium tabular',
                        isCurrentDay && 'bg-primary font-bold text-primary-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayItems.length > 0 ? (
                      <span className="text-[10px] font-bold text-muted-foreground tabular">
                        {dayItems.length} OS
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                    {dayItems.slice(0, 2).map((m) => {
                      const status = effectiveMaintenanceStatus(m)
                      const badgeBg =
                        status === 'CONCLUIDA'
                          ? 'bg-success/15 text-success border-success/30'
                          : status === 'ATRASADA'
                            ? 'bg-danger/15 text-danger border-danger/30'
                            : 'bg-warning/15 text-warning border-warning/30'

                      return (
                        <div
                          key={m.id}
                          className={cn(
                            'truncate rounded border px-1 py-0.5 text-[10px] font-medium',
                            badgeBg,
                          )}
                        >
                          {m.assetTag} · {m.hostname}
                        </div>
                      )
                    })}
                    {dayItems.length > 2 ? (
                      <span className="text-[10px] text-muted-foreground">
                        +{dayItems.length - 2} mais...
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detalhes do Dia Selecionado */}
        <div className="surface-card flex flex-col p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-semibold text-foreground">
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h3>
              <p className="text-xs text-muted-foreground">
                {dayMaintenances.length} {dayMaintenances.length === 1 ? 'manutenção programada' : 'manutenções programadas'}
              </p>
            </div>
            {isToday(selectedDate) ? (
              <Badge variant="outline" className="text-xs">
                Hoje
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
            {dayMaintenances.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <CalendarDays className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                Nenhum atendimento programado para este dia.
              </div>
            ) : (
              dayMaintenances.map((m) => {
                const status = effectiveMaintenanceStatus(m)
                return (
                  <div
                    key={m.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold tabular text-foreground">
                        {m.assetTag}
                      </span>
                      <Badge
                        variant={
                          status === 'CONCLUIDA'
                            ? 'success'
                            : status === 'ATRASADA'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {status}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <p>
                        <strong>Hostname:</strong> {m.hostname}
                      </p>
                      <p>
                        <strong>Técnico:</strong> {m.technicianName}
                      </p>
                      <p>
                        <strong>Tipo:</strong> {MAINTENANCE_TYPE_LABELS[m.type]}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMaintenance(m)
                          setRescheduleOpen(true)
                        }}
                      >
                        Reagendar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedMaintenance(m)
                          const comp = getComputer(m.computerId)
                          setExecutionOpen(true)
                        }}
                      >
                        <Wrench className="mr-1 size-3" />
                        Executar
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Dialogs Integrados */}
      <PreventiveExecutionDialog
        open={executionOpen}
        onOpenChange={setExecutionOpen}
        maintenance={selectedMaintenance}
        computer={selectedMaintenance ? getComputer(selectedMaintenance.computerId) : undefined}
      />

      {selectedMaintenance ? (
        <RescheduleDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          maintenance={selectedMaintenance}
        />
      ) : null}

      <MaintenanceDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        maintenance={selectedMaintenance}
      />
    </div>
  )
}
