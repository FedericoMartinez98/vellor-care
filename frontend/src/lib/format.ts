/**
 * Vellor Care — Utilitários puros de formatação de datas, números e textos.
 *
 * Todas as funções de exibição são tolerantes a `undefined`/`null` e a datas
 * inválidas, devolvendo o travessão `—` em vez de quebrar a interface.
 * Textos e formatos seguem o padrão pt-BR.
 */

import {
  addDays,
  differenceInCalendarDays,
  format as formatWithPattern,
  formatDistanceToNow,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Marcador exibido quando não há valor disponível. */
const EMPTY = '—'

/** Aceita ISO-8601 curto/completo, `Date` ou vazio e devolve uma data válida ou `null`. */
function toDate(value?: string | Date | null): Date | null {
  if (value === undefined || value === null) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const raw = value.trim()
  if (raw.length === 0) return null

  const parsed = parseISODate(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Cria um formatador `Intl.NumberFormat` pt-BR com casas decimais fixas. */
function decimalFormatter(digits: number): Intl.NumberFormat {
  const safeDigits = Math.max(0, Math.min(20, Math.trunc(digits)))
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: safeDigits,
    maximumFractionDigits: safeDigits,
  })
}

/** Verdadeiro apenas para números finitos (descarta `NaN`, `Infinity`, `null`). */
function isFiniteNumber(value?: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

// ============================================================================
// Datas
// ============================================================================

/** Formata a data no padrão brasileiro `25/08/2026`. */
export function formatDate(value?: string | Date | null): string {
  const date = toDate(value)
  return date ? formatWithPattern(date, 'dd/MM/yyyy', { locale: ptBR }) : EMPTY
}

/** Formata data e hora no padrão `25/08/2026 14:30`. */
export function formatDateTime(value?: string | Date | null): string {
  const date = toDate(value)
  return date ? formatWithPattern(date, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : EMPTY
}

/** Formata apenas o horário no padrão 24h `14:30`. */
export function formatTime(value?: string | Date | null): string {
  const date = toDate(value)
  return date ? formatWithPattern(date, 'HH:mm', { locale: ptBR }) : EMPTY
}

/** Formata mês e ano abreviados em pt-BR, ex.: `ago/2026`. */
export function formatMonthYear(value?: string | Date | null): string {
  const date = toDate(value)
  return date ? formatWithPattern(date, 'MMM/yyyy', { locale: ptBR }) : EMPTY
}

/** Descreve a distância até agora com sufixo, ex.: `há 3 dias` ou `em 5 dias`. */
export function formatRelative(value?: string | Date | null): string {
  const date = toDate(value)
  return date ? formatDistanceToNow(date, { addSuffix: true, locale: ptBR }) : EMPTY
}

// ============================================================================
// Números
// ============================================================================

/** Formata um valor monetário em reais, ex.: `R$ 1.234,56`. */
export function formatCurrency(value?: number | null): string {
  if (!isFiniteNumber(value)) return EMPTY
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Formata um número no padrão pt-BR com a quantidade de casas decimais indicada. */
export function formatNumber(value?: number | null, digits = 0): string {
  if (!isFiniteNumber(value)) return EMPTY
  return decimalFormatter(digits).format(value)
}

/** Formata um percentual já expresso em 0–100, ex.: `87%`. */
export function formatPercent(value?: number | null, digits = 0): string {
  if (!isFiniteNumber(value)) return EMPTY
  return `${decimalFormatter(digits).format(value)}%`
}

/** Formata capacidade informada em GB, promovendo para TB a partir de 1024 GB. */
export function formatBytesGb(gb?: number | null): string {
  if (!isFiniteNumber(gb)) return EMPTY

  const compact = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })

  if (Math.abs(gb) >= 1024) {
    return `${compact.format(gb / 1024)} TB`
  }
  return `${compact.format(gb)} GB`
}

/** Formata uma duração em minutos, ex.: `1h 25min`, `45min`. */
export function formatDuration(minutes?: number | null): string {
  if (!isFiniteNumber(minutes) || minutes < 0) return EMPTY

  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const rest = total % 60

  if (hours > 0 && rest > 0) return `${hours}h ${rest}min`
  if (hours > 0) return `${hours}h`
  return `${rest}min`
}

/** Formata tempo ligado em horas, ex.: `12d 4h` ou `4h 30min`. */
export function formatUptime(hours?: number | null): string {
  if (!isFiniteNumber(hours) || hours < 0) return EMPTY

  const totalMinutes = Math.round(hours * 60)
  const days = Math.floor(totalMinutes / 1440)
  const restHours = Math.floor((totalMinutes % 1440) / 60)
  const restMinutes = totalMinutes % 60

  if (days > 0) {
    return restHours > 0 ? `${days}d ${restHours}h` : `${days}d`
  }
  if (restHours > 0) {
    return restMinutes > 0 ? `${restHours}h ${restMinutes}min` : `${restHours}h`
  }
  return `${restMinutes}min`
}

// ============================================================================
// Texto
// ============================================================================

/** Partículas de nomes próprios que não entram nas iniciais. */
const NAME_PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'la'])

/** Extrai até duas iniciais maiúsculas de um nome, ex.: `João da Silva` → `JS`. */
export function initials(name?: string | null): string {
  if (!name) return EMPTY

  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)

  if (words.length === 0) return EMPTY

  const meaningful = words.filter((word) => !NAME_PARTICLES.has(word.toLowerCase()))
  const parts = meaningful.length > 0 ? meaningful : words

  const first = Array.from(parts[0])[0] ?? ''
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : ''

  const result = `${first}${last}`.toLocaleUpperCase('pt-BR')
  return result.length > 0 ? result : EMPTY
}

/** Converte um texto em slug ASCII minúsculo separado por hífens. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ============================================================================
// Cálculos de calendário
// ============================================================================

/** Converte string ISO em `Date`, tratando `YYYY-MM-DD` como data local (sem fuso). */
export function parseISODate(value: string): Date {
  const raw = value.trim()
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)

  if (dateOnly) {
    const year = Number(dateOnly[1])
    const month = Number(dateOnly[2])
    const day = Number(dateOnly[3])
    return new Date(year, month - 1, day)
  }

  return new Date(raw)
}

/** Serializa uma data no formato `YYYY-MM-DD` usando o fuso local. */
export function toISODate(value: Date): string {
  if (Number.isNaN(value.getTime())) return ''
  return formatWithPattern(value, 'yyyy-MM-dd')
}

/** Dias corridos entre duas datas (positivo quando `b` é posterior a `a`). */
export function daysBetween(a: string | Date, b: string | Date): number {
  const start = toDate(a)
  const end = toDate(b)
  if (!start || !end) return 0
  return differenceInCalendarDays(end, start)
}

/** Dias de hoje até a data informada; negativo quando já passou, `null` se inválida. */
export function daysUntil(value?: string | Date | null): number | null {
  const date = toDate(value)
  if (!date) return null
  return differenceInCalendarDays(date, new Date())
}

/** Soma (ou subtrai) dias a uma data ISO e devolve outra data ISO `YYYY-MM-DD`. */
export function addDaysISO(value: string, days: number): string {
  const date = toDate(value)
  if (!date) return ''
  return toISODate(addDays(date, days))
}
