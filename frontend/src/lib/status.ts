/**
 * Vellor Care — Regras de negócio de status, saúde e criticidade.
 *
 * Funções puras (sem acesso a rede, estado global ou DOM) para que a mesma
 * lógica valha no dashboard, nas listagens, nos relatórios e nos testes.
 * Os limiares vêm de `@/lib/constants`; nada é fixado aqui.
 */

import { differenceInCalendarDays } from 'date-fns'

import {
  CRITICAL_SSD_HEALTH_PERCENT,
  CRITICAL_TEMP_C,
  LOW_DISK_FREE_PERCENT,
  NO_MAINTENANCE_ALERT_DAYS,
  PREVENTIVE_WARNING_DAYS,
} from '@/lib/constants'
import { formatNumber, formatPercent, parseISODate } from '@/lib/format'
import type {
  Computer,
  Maintenance,
  MaintenanceChecklistItem,
  MaintenanceStatus,
  MaintenanceType,
  PreventiveHealth,
} from '@/lib/types'

/** Métricas de telemetria que possuem faixa de tolerância própria. */
export type HealthMetric = 'ssdHealth' | 'cpuTemp' | 'gpuTemp' | 'ssdTemp' | 'cpu' | 'ram' | 'disk'

/** Classificação visual de uma métrica de saúde. */
export interface HealthToneResult {
  tone: 'success' | 'warning' | 'danger'
  color: string
  label: string
}

/** Resumo de conclusão de um checklist de manutenção. */
export interface ChecklistCompletion {
  done: number
  total: number
  percent: number
}

/** Dias corridos entre hoje e uma data ISO; `null` quando ausente ou inválida. */
function calendarDaysUntil(value: string | undefined, today: Date): number | null {
  if (!value) return null
  const target = parseISODate(value)
  if (Number.isNaN(target.getTime())) return null
  return differenceInCalendarDays(target, today)
}

// ============================================================================
// Preventiva
// ============================================================================

/** Classifica o semáforo da preventiva de um computador em EM_DIA, PROXIMA ou ATRASADA. */
export function preventiveHealthOf(
  computer: Pick<Computer, 'nextMaintenanceAt'>,
  today: Date = new Date(),
): PreventiveHealth {
  const remainingDays = calendarDaysUntil(computer.nextMaintenanceAt, today)

  if (remainingDays === null) return 'ATRASADA'
  if (remainingDays < 0) return 'ATRASADA'
  if (remainingDays <= PREVENTIVE_WARNING_DAYS) return 'PROXIMA'
  return 'EM_DIA'
}

/** Indica se uma manutenção agendada já passou da data prevista. */
export function isMaintenanceOverdue(
  m: Pick<Maintenance, 'status' | 'scheduledFor'>,
  today: Date = new Date(),
): boolean {
  if (m.status !== 'AGENDADA') return false
  const remainingDays = calendarDaysUntil(m.scheduledFor, today)
  return remainingDays !== null && remainingDays < 0
}

/** Devolve o status real da manutenção, promovendo agendamentos vencidos a ATRASADA. */
export function effectiveMaintenanceStatus(
  m: Pick<Maintenance, 'status' | 'scheduledFor'>,
  today: Date = new Date(),
): MaintenanceStatus {
  return isMaintenanceOverdue(m, today) ? 'ATRASADA' : m.status
}

// ============================================================================
// Criticidade do computador
// ============================================================================

/** Monta a lista de motivos que tornam um computador crítico (vazia se estiver saudável). */
function collectCriticalReasons(c: Computer, today: Date): string[] {
  const reasons: string[] = []
  const health = c.health

  if (health) {
    if (health.ssdHealthPercent < CRITICAL_SSD_HEALTH_PERCENT) {
      reasons.push(
        `Saúde do SSD em ${formatPercent(health.ssdHealthPercent)} (mínimo aceitável: ${formatPercent(CRITICAL_SSD_HEALTH_PERCENT)}).`,
      )
    }

    if (health.cpuTempC > CRITICAL_TEMP_C) {
      reasons.push(
        `Temperatura da CPU em ${formatNumber(health.cpuTempC)} °C (limite: ${formatNumber(CRITICAL_TEMP_C)} °C).`,
      )
    }

    if (health.ssdTempC > CRITICAL_TEMP_C) {
      reasons.push(
        `Temperatura do SSD em ${formatNumber(health.ssdTempC)} °C (limite: ${formatNumber(CRITICAL_TEMP_C)} °C).`,
      )
    }

    if (health.diskFreePercent < LOW_DISK_FREE_PERCENT) {
      reasons.push(
        `Apenas ${formatPercent(health.diskFreePercent)} de espaço livre em disco (mínimo: ${formatPercent(LOW_DISK_FREE_PERCENT)}).`,
      )
    }
  }

  const daysSinceMaintenance = c.lastMaintenanceAt
    ? -(calendarDaysUntil(c.lastMaintenanceAt, today) ?? 0)
    : null

  if (daysSinceMaintenance !== null && daysSinceMaintenance > NO_MAINTENANCE_ALERT_DAYS) {
    reasons.push(
      `Sem manutenção há ${formatNumber(daysSinceMaintenance)} dias (limite: ${formatNumber(NO_MAINTENANCE_ALERT_DAYS)} dias).`,
    )
  }

  if (c.status === 'EM_MANUTENCAO' && preventiveHealthOf(c, today) === 'ATRASADA') {
    reasons.push('Equipamento em manutenção com preventiva atrasada.')
  }

  return reasons
}

/** Indica se o computador exige atenção imediata por telemetria ou preventiva vencida. */
export function computerIsCritical(c: Computer): boolean {
  return collectCriticalReasons(c, new Date()).length > 0
}

/** Lista, em pt-BR, os motivos que colocam o computador em estado crítico. */
export function criticalReasons(c: Computer): string[] {
  return collectCriticalReasons(c, new Date())
}

// ============================================================================
// Faixas de saúde (telemetria)
// ============================================================================

/** Rótulos exibidos para cada métrica em cada faixa de tolerância. */
const HEALTH_LABELS: Record<HealthMetric, Record<HealthToneResult['tone'], string>> = {
  ssdHealth: { success: 'Saudável', warning: 'Desgaste', danger: 'Crítico' },
  cpuTemp: { success: 'Normal', warning: 'Elevada', danger: 'Crítica' },
  gpuTemp: { success: 'Normal', warning: 'Elevada', danger: 'Crítica' },
  ssdTemp: { success: 'Normal', warning: 'Elevada', danger: 'Crítica' },
  cpu: { success: 'Normal', warning: 'Alto', danger: 'Crítico' },
  ram: { success: 'Normal', warning: 'Alto', danger: 'Crítico' },
  disk: { success: 'Espaço ok', warning: 'Espaço baixo', danger: 'Espaço crítico' },
}

/** Cor CSS (token de tema) correspondente a cada tom. */
const TONE_COLORS: Record<HealthToneResult['tone'], string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}

/** Resolve o tom de uma métrica conforme a direção da faixa (maior é melhor ou pior). */
function toneFor(metric: HealthMetric, value: number): HealthToneResult['tone'] {
  switch (metric) {
    case 'ssdHealth':
      if (value >= 70) return 'success'
      if (value >= 20) return 'warning'
      return 'danger'
    case 'cpuTemp':
    case 'gpuTemp':
      if (value < 70) return 'success'
      if (value < 85) return 'warning'
      return 'danger'
    case 'ssdTemp':
      if (value < 55) return 'success'
      if (value < 70) return 'warning'
      return 'danger'
    case 'cpu':
    case 'ram':
      if (value < 70) return 'success'
      if (value < 88) return 'warning'
      return 'danger'
    case 'disk':
      if (value >= 25) return 'success'
      if (value >= 15) return 'warning'
      return 'danger'
  }
}

/** Classifica um valor de telemetria devolvendo tom, cor do tema e rótulo em pt-BR. */
export function healthTone(metric: HealthMetric, value: number): HealthToneResult {
  const tone = Number.isFinite(value) ? toneFor(metric, value) : 'danger'
  return { tone, color: TONE_COLORS[tone], label: HEALTH_LABELS[metric][tone] }
}

// ============================================================================
// Checklist e rótulo de serviço
// ============================================================================

/** Calcula itens concluídos, total e percentual de conclusão de um checklist. */
export function checklistCompletion(items: MaintenanceChecklistItem[]): ChecklistCompletion {
  const total = items.length
  const done = items.filter((item) => item.done).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return { done, total, percent }
}

/** Nomes em pt-BR dos tipos de manutenção. */
const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVA: 'Preventiva',
  CORRETIVA: 'Corretiva',
  INSTALACAO: 'Instalação',
  UPGRADE: 'Upgrade',
  FORMATACAO: 'Formatação',
}

/** Reduz a observação a uma linha curta, apta a compor um rótulo. */
function summarizeNotes(notes: string | undefined): string | null {
  if (!notes) return null
  const firstLine = notes.split('\n')[0]?.trim() ?? ''
  if (firstLine.length === 0) return null
  return firstLine.length > 60 ? `${firstLine.slice(0, 59).trimEnd()}…` : firstLine
}

/** Rótulo curto do serviço, ex.: `Preventiva — 18/21 itens` ou `Corretiva — troca de SSD`. */
export function maintenanceServiceLabel(m: Maintenance): string {
  const base = MAINTENANCE_TYPE_LABELS[m.type]
  const checklist = checklistCompletion(m.checklist ?? [])
  const notes = summarizeNotes(m.notes)

  if (m.type === 'PREVENTIVA' && checklist.total > 0) {
    return `${base} — ${checklist.done}/${checklist.total} itens`
  }
  if (notes) {
    return `${base} — ${notes}`
  }
  if (checklist.total > 0) {
    return `${base} — ${checklist.done}/${checklist.total} itens`
  }
  return base
}
