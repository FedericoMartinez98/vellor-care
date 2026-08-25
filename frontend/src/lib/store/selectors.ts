/**
 * Vellor Care — Seletores derivados do banco local.
 *
 * Funções puras (sem React, sem estado, sem DOM) que recebem a `VellorDatabase`
 * e devolvem os agregados tipados consumidos por dashboard, relatórios, busca
 * global e central de alertas. Toda regra de negócio reaproveita
 * `@/lib/status` e `@/lib/format`; nada é reimplementado aqui.
 */

import {
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

import {
  CRITICAL_SSD_HEALTH_PERCENT,
  CRITICAL_TEMP_C,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  NAV_ITEMS,
  NO_MAINTENANCE_ALERT_DAYS,
  PART_CATEGORY_LABELS,
  PREVENTIVE_WARNING_DAYS,
  USER_ROLE_LABELS,
} from '@/lib/constants'
import type { VellorDatabase } from '@/lib/data/seed'
import { formatDate, formatNumber, formatPercent, parseISODate, toISODate } from '@/lib/format'
import {
  computerIsCritical,
  effectiveMaintenanceStatus,
  isMaintenanceOverdue,
  maintenanceServiceLabel,
  preventiveHealthOf,
} from '@/lib/status'
import type {
  ActivityEntry,
  AppNotification,
  Computer,
  ComputerStatus,
  DashboardMetrics,
  DurationSeriesPoint,
  GlobalSearchResult,
  Maintenance,
  MaintenanceStatus,
  MonthlySeriesPoint,
  SectorSeriesPoint,
  Severity,
  StatusSeriesPoint,
  TechnicianProductivity,
} from '@/lib/types'

// ============================================================================
// Tipos auxiliares
// ============================================================================

/** Intervalo fechado de datas ISO (`YYYY-MM-DD`) usado nos filtros de relatório. */
export interface DateRange {
  from: string
  to: string
}

/** Consumo acumulado de uma peça no período analisado. */
export interface PartsUsageEntry {
  partId: string
  partName: string
  quantity: number
  totalCost: number
}

// ============================================================================
// Constantes internas
// ============================================================================

/** Janela usada para calcular o tempo médio de manutenção do dashboard, em dias. */
const AVERAGE_WINDOW_DAYS = 90
/** Janela considerada nas manutenções concluídas por setor, em meses. */
const SECTOR_WINDOW_MONTHS = 12

const STATUS_COLORS: Record<MaintenanceStatus, string> = {
  CONCLUIDA: 'var(--success)',
  AGENDADA: 'var(--warning)',
  ATRASADA: 'var(--danger)',
  EM_ANDAMENTO: 'var(--info)',
  CANCELADA: 'var(--muted-foreground)',
}

const STATUS_ORDER: MaintenanceStatus[] = [
  'CONCLUIDA',
  'AGENDADA',
  'ATRASADA',
  'EM_ANDAMENTO',
  'CANCELADA',
]

const SEVERITY_RANK: Record<Severity, number> = { CRITICO: 0, AVISO: 1, INFO: 2 }

/** Máximo de itens devolvidos por categoria na busca global. */
const SEARCH_LIMIT_PER_KIND = 8
/** Máximo absoluto de itens devolvidos pela busca global. */
const SEARCH_LIMIT_TOTAL = 30

// ============================================================================
// Helpers internos
// ============================================================================

/** Converte uma data ISO em `Date`, devolvendo `null` quando ausente ou inválida. */
function toDateOrNull(value?: string | null): Date | null {
  if (!value) return null
  const parsed = parseISODate(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Chave `YYYY-MM` da data informada, ou `null` quando ela não existe. */
function monthKeyOf(value?: string | null): string | null {
  const date = toDateOrNull(value)
  return date ? format(date, 'yyyy-MM') : null
}

/** Média aritmética arredondada; `0` quando não há amostras. */
function average(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round(sum / values.length)
}

/** Percentual inteiro de `part` sobre `total`; `0` quando o total é zero. */
function percentOf(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

/** Data que posiciona a manutenção na linha do tempo (execução, senão agendamento). */
function timelineDateOf(m: Maintenance): string {
  return m.finishedAt ?? m.startedAt ?? m.scheduledFor
}

/** Data usada no feed de atividades: conclusão, senão início, senão criação. */
function activityDateOf(m: Maintenance): string {
  return m.finishedAt ?? m.startedAt ?? m.createdAt
}

/** Verifica se a data ISO cai dentro do intervalo (intervalo ausente aceita tudo). */
function withinRange(value: string | undefined | null, range?: DateRange): boolean {
  if (!range) return true
  const date = toDateOrNull(value)
  if (!date) return false

  const from = toDateOrNull(range.from)
  const to = toDateOrNull(range.to)
  if (from && date < startOfDay(from)) return false
  if (to && date > endOfDay(to)) return false
  return true
}

/** Rótulo curto do equipamento, ex.: `PC-0031 · ADM-DT-07`. */
function computerLabelOf(c: Pick<Computer, 'assetTag' | 'hostname'>): string {
  return `${c.assetTag} · ${c.hostname}`
}

/** Concordância de dias em pt-BR, ex.: `1 dia` / `12 dias`. */
function pluralDays(days: number): string {
  return days === 1 ? '1 dia' : `${formatNumber(days)} dias`
}

interface MonthBucket {
  key: string
  label: string
}

/** Sequência de meses do mais antigo ao mês corrente, rotulada como `ago/26`. */
function monthBuckets(today: Date, months: number): MonthBucket[] {
  const total = Math.max(1, Math.trunc(months))
  const base = startOfMonth(today)

  return Array.from({ length: total }, (_, index) => {
    const start = subMonths(base, total - 1 - index)
    return {
      key: format(start, 'yyyy-MM'),
      label: format(start, 'MMM/yy', { locale: ptBR }),
    }
  })
}

// ============================================================================
// 1. Dashboard
// ============================================================================

/** Consolida os indicadores do topo do dashboard a partir do banco local. */
export function buildDashboardMetrics(
  db: VellorDatabase,
  today: Date = new Date(),
): DashboardMetrics {
  const computersByStatus: Record<ComputerStatus, number> = {
    ATIVO: 0,
    EM_MANUTENCAO: 0,
    RESERVA: 0,
    DESATIVADO: 0,
  }

  let overduePreventives = 0
  let criticalComputers = 0
  let considered = 0
  let onSchedule = 0

  for (const computer of db.computers) {
    computersByStatus[computer.status] += 1

    const health = preventiveHealthOf(computer, today)
    if (health === 'ATRASADA') overduePreventives += 1
    if (computerIsCritical(computer)) criticalComputers += 1

    // A conformidade ignora equipamentos desativados: eles não exigem preventiva.
    if (computer.status !== 'DESATIVADO') {
      considered += 1
      if (health === 'EM_DIA') onSchedule += 1
    }
  }

  const currentMonthKey = format(startOfMonth(today), 'yyyy-MM')
  let preventivesThisMonth = 0
  let preventivesThisMonthDone = 0
  let completedToday = 0
  const recentDurations: number[] = []

  for (const m of db.maintenances) {
    if (m.type === 'PREVENTIVA' && monthKeyOf(m.scheduledFor) === currentMonthKey) {
      preventivesThisMonth += 1
      if (m.status === 'CONCLUIDA') preventivesThisMonthDone += 1
    }

    const finished = toDateOrNull(m.finishedAt)
    if (finished && isSameDay(finished, today)) completedToday += 1

    if (m.status === 'CONCLUIDA' && typeof m.durationMinutes === 'number' && finished) {
      const age = differenceInCalendarDays(today, finished)
      if (age >= 0 && age <= AVERAGE_WINDOW_DAYS) recentDurations.push(m.durationMinutes)
    }
  }

  return {
    totalComputers: db.computers.length,
    computersByStatus,
    preventivesThisMonth,
    preventivesThisMonthDone,
    overduePreventives,
    completedToday,
    criticalComputers,
    averageMaintenanceMinutes: average(recentDurations),
    complianceRate: percentOf(onSchedule, considered),
  }
}

// ============================================================================
// 2. Série mensal
// ============================================================================

/** Agendadas, concluídas e atrasadas mês a mês, do mais antigo ao atual. */
export function buildMonthlySeries(
  db: VellorDatabase,
  months = 12,
  today: Date = new Date(),
): MonthlySeriesPoint[] {
  const buckets = monthBuckets(today, months)
  const index = new Map<string, MonthlySeriesPoint>()
  const series = buckets.map<MonthlySeriesPoint>((bucket) => {
    const point: MonthlySeriesPoint = { month: bucket.label, agendadas: 0, concluidas: 0, atrasadas: 0 }
    index.set(bucket.key, point)
    return point
  })

  for (const m of db.maintenances) {
    const scheduledKey = monthKeyOf(m.scheduledFor)
    if (scheduledKey) {
      const point = index.get(scheduledKey)
      if (point) point.agendadas += 1
      if (point && isMaintenanceOverdue(m, today)) point.atrasadas += 1
    }

    if (m.status === 'CONCLUIDA') {
      const doneKey = monthKeyOf(m.finishedAt ?? m.scheduledFor)
      const point = doneKey ? index.get(doneKey) : undefined
      if (point) point.concluidas += 1
    }
  }

  return series
}

// ============================================================================
// 3. Série por setor
// ============================================================================

/** Compliance de preventiva por setor, do setor com mais equipamentos ao menor. */
export function buildSectorSeries(db: VellorDatabase, today: Date = new Date()): SectorSeriesPoint[] {
  const cutoff = startOfDay(subMonths(today, SECTOR_WINDOW_MONTHS))

  const points = db.sectors.map<SectorSeriesPoint>((sector) => {
    const computers = db.computers.filter((c) => c.assignment.sectorId === sector.id)

    let emDia = 0
    let pendentes = 0
    let atrasadas = 0

    for (const computer of computers) {
      const health = preventiveHealthOf(computer, today)
      if (health === 'EM_DIA') emDia += 1
      else if (health === 'PROXIMA') pendentes += 1
      else atrasadas += 1
    }

    const concluidas = db.maintenances.filter((m) => {
      if (m.sectorId !== sector.id || m.status !== 'CONCLUIDA') return false
      const date = toDateOrNull(timelineDateOf(m))
      return date !== null && date >= cutoff
    }).length

    return {
      sectorId: sector.id,
      sector: sector.name,
      total: computers.length,
      emDia,
      pendentes,
      atrasadas,
      concluidas,
      compliance: percentOf(emDia, computers.length),
    }
  })

  return points.sort((a, b) => b.total - a.total || a.sector.localeCompare(b.sector, 'pt-BR'))
}

// ============================================================================
// 4. Distribuição por status
// ============================================================================

/** Distribuição das manutenções pelo status efetivo, omitindo status zerados. */
export function buildStatusSeries(db: VellorDatabase, today: Date = new Date()): StatusSeriesPoint[] {
  const counters: Record<MaintenanceStatus, number> = {
    AGENDADA: 0,
    EM_ANDAMENTO: 0,
    CONCLUIDA: 0,
    ATRASADA: 0,
    CANCELADA: 0,
  }

  for (const m of db.maintenances) {
    counters[effectiveMaintenanceStatus(m, today)] += 1
  }

  return STATUS_ORDER.filter((status) => counters[status] > 0).map<StatusSeriesPoint>((status) => ({
    status,
    label: MAINTENANCE_STATUS_LABELS[status],
    value: counters[status],
    color: STATUS_COLORS[status],
  }))
}

// ============================================================================
// 5. Duração média
// ============================================================================

/** Tempo médio de execução (minutos) por mês, do mais antigo ao atual. */
export function buildDurationSeries(
  db: VellorDatabase,
  months = 6,
  today: Date = new Date(),
): DurationSeriesPoint[] {
  const buckets = monthBuckets(today, months)
  const samples = new Map<string, number[]>(buckets.map((bucket) => [bucket.key, []]))

  for (const m of db.maintenances) {
    if (m.status !== 'CONCLUIDA' || typeof m.durationMinutes !== 'number') continue
    const key = monthKeyOf(m.finishedAt ?? m.scheduledFor)
    if (!key) continue
    samples.get(key)?.push(m.durationMinutes)
  }

  return buckets.map<DurationSeriesPoint>((bucket) => ({
    month: bucket.label,
    minutos: average(samples.get(bucket.key) ?? []),
  }))
}

// ============================================================================
// 6. Atividade recente
// ============================================================================

/** Últimas manutenções movimentadas, da mais recente para a mais antiga. */
export function buildRecentActivity(
  db: VellorDatabase,
  limit = 8,
  today: Date = new Date(),
): ActivityEntry[] {
  const entries = db.maintenances.map<ActivityEntry>((m) => ({
    id: m.id,
    maintenanceId: m.id,
    computerLabel: computerLabelOf(m),
    computerId: m.computerId,
    technicianName: m.technicianName,
    service: maintenanceServiceLabel(m),
    type: m.type,
    status: effectiveMaintenanceStatus(m, today),
    date: activityDateOf(m),
  }))

  return entries
    .sort((a, b) => {
      const left = toDateOrNull(a.date)?.getTime() ?? 0
      const right = toDateOrNull(b.date)?.getTime() ?? 0
      return right - left
    })
    .slice(0, Math.max(0, Math.trunc(limit)))
}

// ============================================================================
// 7. Produtividade por técnico
// ============================================================================

/** Volume, conclusões, tempo médio e peças por técnico, ordenado por conclusões. */
export function buildTechnicianProductivity(
  db: VellorDatabase,
  range?: DateRange,
): TechnicianProductivity[] {
  interface Accumulator {
    technicianId: string
    technicianName: string
    total: number
    concluidas: number
    durations: number[]
    partsUsed: number
  }

  const byTechnician = new Map<string, Accumulator>()

  for (const m of db.maintenances) {
    if (!m.technicianId) continue
    if (!withinRange(timelineDateOf(m), range)) continue

    const fallbackName = db.users.find((u) => u.id === m.technicianId)?.name
    let acc = byTechnician.get(m.technicianId)
    if (!acc) {
      acc = {
        technicianId: m.technicianId,
        technicianName: m.technicianName || fallbackName || 'Técnico não identificado',
        total: 0,
        concluidas: 0,
        durations: [],
        partsUsed: 0,
      }
      byTechnician.set(m.technicianId, acc)
    }

    acc.total += 1
    if (m.status === 'CONCLUIDA') {
      acc.concluidas += 1
      if (typeof m.durationMinutes === 'number') acc.durations.push(m.durationMinutes)
    }
    for (const usage of m.parts) {
      acc.partsUsed += usage.quantity
    }
  }

  return Array.from(byTechnician.values())
    .map<TechnicianProductivity>((acc) => ({
      technicianId: acc.technicianId,
      technicianName: acc.technicianName,
      total: acc.total,
      concluidas: acc.concluidas,
      averageMinutes: average(acc.durations),
      partsUsed: acc.partsUsed,
    }))
    .sort(
      (a, b) =>
        b.concluidas - a.concluidas ||
        b.total - a.total ||
        a.technicianName.localeCompare(b.technicianName, 'pt-BR'),
    )
}

// ============================================================================
// 8. Consumo de peças
// ============================================================================

/** Peças consumidas nas manutenções concluídas do período, da mais usada à menos. */
export function buildPartsUsage(db: VellorDatabase, range?: DateRange): PartsUsageEntry[] {
  const byPart = new Map<string, PartsUsageEntry>()

  for (const m of db.maintenances) {
    if (m.status !== 'CONCLUIDA') continue
    if (!withinRange(timelineDateOf(m), range)) continue

    for (const usage of m.parts) {
      const part = db.parts.find((p) => p.id === usage.partId)
      // Preserva o custo praticado na época; só cai no valor atual quando ausente.
      const unitCost = usage.unitCost ?? part?.unitValue ?? 0

      const entry = byPart.get(usage.partId)
      if (entry) {
        entry.quantity += usage.quantity
        entry.totalCost += usage.quantity * unitCost
      } else {
        byPart.set(usage.partId, {
          partId: usage.partId,
          partName: usage.partName || part?.name || 'Peça removida',
          quantity: usage.quantity,
          totalCost: usage.quantity * unitCost,
        })
      }
    }
  }

  return Array.from(byPart.values()).sort(
    (a, b) => b.quantity - a.quantity || a.partName.localeCompare(b.partName, 'pt-BR'),
  )
}

// ============================================================================
// 9. Regras de alerta
// ============================================================================

/** Avalia as sete regras de alerta e devolve as notificações do dia, sem duplicatas. */
export function computeAlerts(db: VellorDatabase, today: Date = new Date()): AppNotification[] {
  const stamp = toISODate(today)
  const createdAt = today.toISOString()
  const alerts = new Map<string, AppNotification>()

  const push = (alert: AppNotification): void => {
    if (!alerts.has(alert.id)) alerts.set(alert.id, alert)
  }

  for (const computer of db.computers) {
    const label = computerLabelOf(computer)
    const href = `/inventario/${computer.id}`
    const nextDate = toDateOrNull(computer.nextMaintenanceAt)

    if (nextDate) {
      const remaining = differenceInCalendarDays(nextDate, today)

      if (remaining < 0) {
        push({
          id: `PREVENTIVA_ATRASADA:${computer.id}:${stamp}`,
          type: 'PREVENTIVA_ATRASADA',
          severity: 'CRITICO',
          title: 'Preventiva atrasada',
          message: `${label} está com a preventiva atrasada há ${pluralDays(-remaining)} (prevista para ${formatDate(computer.nextMaintenanceAt)}).`,
          computerId: computer.id,
          href,
          read: false,
          createdAt,
        })
      } else if (remaining === 0) {
        push({
          id: `PREVENTIVA_HOJE:${computer.id}:${stamp}`,
          type: 'PREVENTIVA_HOJE',
          severity: 'AVISO',
          title: 'Preventiva para hoje',
          message: `${label} tem preventiva programada para hoje.`,
          computerId: computer.id,
          href,
          read: false,
          createdAt,
        })
      } else if (remaining <= PREVENTIVE_WARNING_DAYS) {
        push({
          id: `PREVENTIVA_7_DIAS:${computer.id}:${stamp}`,
          type: 'PREVENTIVA_7_DIAS',
          severity: 'AVISO',
          title: 'Preventiva próxima',
          message: `${label} tem preventiva em ${pluralDays(remaining)}, no dia ${formatDate(computer.nextMaintenanceAt)}.`,
          computerId: computer.id,
          href,
          read: false,
          createdAt,
        })
      }
    }

    const health = computer.health
    if (health) {
      if (health.ssdHealthPercent < CRITICAL_SSD_HEALTH_PERCENT) {
        push({
          id: `SSD_SAUDE_BAIXA:${computer.id}:${stamp}`,
          type: 'SSD_SAUDE_BAIXA',
          severity: 'CRITICO',
          title: 'Saúde do SSD baixa',
          message: `O SSD de ${label} está com ${formatPercent(health.ssdHealthPercent)} de saúde (mínimo aceitável: ${formatPercent(CRITICAL_SSD_HEALTH_PERCENT)}).`,
          computerId: computer.id,
          href,
          read: false,
          createdAt,
        })
      }

      // Um único alerta por equipamento/dia, listando todos os sensores acima do limite.
      const hotSensors: string[] = []
      if (health.cpuTempC > CRITICAL_TEMP_C) {
        hotSensors.push(`CPU a ${formatNumber(health.cpuTempC)} °C`)
      }
      if (health.ssdTempC > CRITICAL_TEMP_C) {
        hotSensors.push(`SSD a ${formatNumber(health.ssdTempC)} °C`)
      }
      if (hotSensors.length > 0) {
        push({
          id: `TEMPERATURA_ALTA:${computer.id}:${stamp}`,
          type: 'TEMPERATURA_ALTA',
          severity: 'CRITICO',
          title: 'Temperatura alta',
          message: `${label} passou do limite de ${formatNumber(CRITICAL_TEMP_C)} °C: ${hotSensors.join(' e ')}.`,
          computerId: computer.id,
          href,
          read: false,
          createdAt,
        })
      }
    }

    const lastDate = toDateOrNull(computer.lastMaintenanceAt)
    if (lastDate) {
      const idleDays = differenceInCalendarDays(today, lastDate)
      if (idleDays > NO_MAINTENANCE_ALERT_DAYS) {
        push({
          id: `SEM_MANUTENCAO_120_DIAS:${computer.id}:${stamp}`,
          type: 'SEM_MANUTENCAO_120_DIAS',
          severity: 'AVISO',
          title: 'Sem manutenção há muito tempo',
          message: `${label} está há ${pluralDays(idleDays)} sem manutenção (limite: ${formatNumber(NO_MAINTENANCE_ALERT_DAYS)} dias).`,
          computerId: computer.id,
          href,
          read: false,
          createdAt,
        })
      }
    }
  }

  for (const part of db.parts) {
    if (part.quantity <= part.minimumQuantity) {
      push({
        id: `ESTOQUE_MINIMO:${part.id}:${stamp}`,
        type: 'ESTOQUE_MINIMO',
        severity: 'AVISO',
        title: 'Estoque mínimo atingido',
        message: `${part.name} (${part.sku}) está com ${formatNumber(part.quantity)} ${part.unit} em estoque — o mínimo é ${formatNumber(part.minimumQuantity)} ${part.unit}.`,
        partId: part.id,
        href: '/estoque',
        read: false,
        createdAt,
      })
    }
  }

  return Array.from(alerts.values()).sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.id.localeCompare(b.id, 'pt-BR'),
  )
}

// ============================================================================
// 10. Busca global
// ============================================================================

/** Remove acentos e caixa alta para comparação tolerante a digitação. */
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Melhor pontuação do termo nos campos (0 exato, 1 início, 2 contém, `null` sem match). */
function matchScore(fields: Array<string | undefined | null>, query: string): number | null {
  let best: number | null = null

  for (const field of fields) {
    if (!field) continue
    const haystack = normalizeText(field)
    if (haystack === query) return 0

    const position = haystack.indexOf(query)
    if (position === 0) best = best === null ? 1 : Math.min(best, 1)
    else if (position > 0 && best === null) best = 2
  }

  return best
}

/** Ordena por relevância e corta a categoria no limite de resultados. */
function rank(scored: Array<{ score: number; result: GlobalSearchResult }>): GlobalSearchResult[] {
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, SEARCH_LIMIT_PER_KIND)
    .map((item) => item.result)
}

/** Busca instantânea (Cmd+K) em equipamentos, manutenções, peças, setores, usuários e páginas. */
export function buildGlobalSearch(db: VellorDatabase, query: string): GlobalSearchResult[] {
  const term = normalizeText(query.trim())
  if (term.length === 0) return []

  const sectorNames = new Map(db.sectors.map((sector) => [sector.id, sector.name]))

  const computers: Array<{ score: number; result: GlobalSearchResult }> = []
  for (const c of db.computers) {
    const score = matchScore(
      [c.assetTag, c.hostname, c.serialNumber, c.assignment.employeeName, c.model, c.manufacturer],
      term,
    )
    if (score === null) continue
    computers.push({
      score,
      result: {
        id: c.id,
        kind: 'COMPUTADOR',
        title: computerLabelOf(c),
        subtitle: `${c.assignment.employeeName} · ${sectorNames.get(c.assignment.sectorId) ?? c.assignment.unit}`,
        href: `/inventario/${c.id}`,
      },
    })
  }

  const maintenances: Array<{ score: number; result: GlobalSearchResult }> = []
  for (const m of db.maintenances) {
    const score = matchScore([m.assetTag, m.hostname, m.technicianName, m.notes], term)
    if (score === null) continue
    maintenances.push({
      score,
      result: {
        id: m.id,
        kind: 'MANUTENCAO',
        title: `${MAINTENANCE_TYPE_LABELS[m.type]} · ${m.assetTag}`,
        subtitle: `${m.technicianName} · ${formatDate(timelineDateOf(m))}`,
        href: `/historico?m=${m.id}`,
      },
    })
  }

  const parts: Array<{ score: number; result: GlobalSearchResult }> = []
  for (const p of db.parts) {
    const score = matchScore([p.sku, p.name], term)
    if (score === null) continue
    parts.push({
      score,
      result: {
        id: p.id,
        kind: 'PECA',
        title: p.name,
        subtitle: `${p.sku} · ${PART_CATEGORY_LABELS[p.category]} · ${formatNumber(p.quantity)} ${p.unit}`,
        href: `/estoque?p=${p.id}`,
      },
    })
  }

  const sectors: Array<{ score: number; result: GlobalSearchResult }> = []
  for (const s of db.sectors) {
    const score = matchScore([s.name, s.code], term)
    if (score === null) continue
    sectors.push({
      score,
      result: {
        id: s.id,
        kind: 'SETOR',
        title: s.name,
        subtitle: `${s.code} · ${s.unit}`,
        href: `/setores?s=${s.id}`,
      },
    })
  }

  const users: Array<{ score: number; result: GlobalSearchResult }> = []
  for (const u of db.users) {
    const score = matchScore([u.name, u.email], term)
    if (score === null) continue
    users.push({
      score,
      result: {
        id: u.id,
        kind: 'USUARIO',
        title: u.name,
        subtitle: `${u.email} · ${USER_ROLE_LABELS[u.role]}`,
        href: `/configuracoes?u=${u.id}`,
      },
    })
  }

  const pages: Array<{ score: number; result: GlobalSearchResult }> = []
  for (const item of NAV_ITEMS) {
    const score = matchScore([item.label, item.href], term)
    if (score === null) continue
    pages.push({
      score,
      result: {
        id: `pagina:${item.href}`,
        kind: 'PAGINA',
        title: item.label,
        subtitle: 'Ir para a página',
        href: item.href,
      },
    })
  }

  return [
    ...rank(computers),
    ...rank(maintenances),
    ...rank(parts),
    ...rank(sectors),
    ...rank(users),
    ...rank(pages),
  ].slice(0, SEARCH_LIMIT_TOTAL)
}
