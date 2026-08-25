'use client'

/**
 * Vellor Care — Store reativo da aplicação.
 *
 * Enquanto o backend Spring Boot não está plugado, o app inteiro roda no
 * cliente: os dados nascem do seed determinístico (`@/lib/data/seed`), vivem em
 * memória num `useReducer` e são persistidos em `localStorage` com debounce.
 *
 * A fachada exposta por `useVellor()` espelha a API REST do backend, portanto
 * a migração para o servidor deve se resumir a trocar as implementações por
 * chamadas de `src/lib/api`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

import { buildAssetUrl } from '@/lib/asset-label'
import {
  CHECKLIST_DEFINITIONS,
  DEFAULT_MAINTENANCE_INTERVAL_DAYS,
  MOVEMENT_TYPE_LABELS,
} from '@/lib/constants'
import { createSeedDatabase, SEED_VERSION, type VellorDatabase } from '@/lib/data/seed'
import { addDaysISO, toISODate } from '@/lib/format'
import type {
  ComputerInput,
  MaintenanceInput,
  MovementInput,
  PartInput,
  SectorInput,
  UserInput,
} from '@/lib/schemas'
import { buildGlobalSearch, computeAlerts } from '@/lib/store/selectors'
import {
  MODULES,
  type AppNotification,
  type Computer,
  type GlobalSearchResult,
  type HealthSnapshot,
  type InventoryMovement,
  type InventoryPart,
  type Maintenance,
  type MaintenanceChecklistItem,
  type MaintenancePartUsage,
  type MaintenancePhoto,
  type ModuleKey,
  type MovementType,
  type Permission,
  type Sector,
  type Unit,
  type User,
  type UserRole,
} from '@/lib/types'

// ============================================================================
// Contrato público
// ============================================================================

/** Dados coletados na execução do checklist e enviados ao encerrar a manutenção. */
export interface CompleteMaintenancePayload {
  checklist: MaintenanceChecklistItem[]
  notes?: string
  durationMinutes: number
  parts: { partId: string; quantity: number }[]
  photosBefore: string[]
  photosAfter: string[]
  signatureDataUrl: string
}

/** Tudo que `useVellor()` entrega às telas. */
export interface VellorStore {
  ready: boolean
  db: VellorDatabase
  currentUser: User

  sectors: Sector[]
  units: Unit[]
  users: User[]
  technicians: User[]
  computers: Computer[]
  maintenances: Maintenance[]
  parts: InventoryPart[]
  movements: InventoryMovement[]
  notifications: AppNotification[]
  unreadCount: number

  getComputer: (id: string) => Computer | undefined
  getSector: (id: string) => Sector | undefined
  getSectorName: (id: string) => string
  getUser: (id: string) => User | undefined
  getPart: (id: string) => InventoryPart | undefined
  getMaintenance: (id: string) => Maintenance | undefined
  maintenancesOfComputer: (computerId: string) => Maintenance[]
  movementsOfPart: (partId: string) => InventoryMovement[]
  computersOfSector: (sectorId: string) => Computer[]

  createComputer: (input: ComputerInput) => Computer
  updateComputer: (id: string, input: ComputerInput) => void
  deleteComputer: (id: string) => void
  updateHealth: (computerId: string, snapshot: Omit<HealthSnapshot, 'computerId'>) => void

  createMaintenance: (input: MaintenanceInput) => Maintenance
  startMaintenance: (id: string) => void
  completeMaintenance: (id: string, payload: CompleteMaintenancePayload) => void
  cancelMaintenance: (id: string, reason?: string) => void
  rescheduleMaintenance: (id: string, scheduledFor: string) => void
  deleteMaintenance: (id: string) => void

  createPart: (input: PartInput) => InventoryPart
  updatePart: (id: string, input: PartInput) => void
  deletePart: (id: string) => void
  movePart: (input: MovementInput) => void

  createSector: (input: SectorInput) => Sector
  updateSector: (id: string, input: SectorInput) => void
  deleteSector: (id: string) => void
  createUser: (input: UserInput) => User
  updateUser: (id: string, input: UserInput) => void
  deleteUser: (id: string) => void
  setCurrentUser: (id: string) => void

  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  dismissNotification: (id: string) => void
  refreshAlerts: () => void

  search: (query: string) => GlobalSearchResult[]
  resetDatabase: () => void
  exportDatabase: () => string
  importDatabase: (json: string) => boolean
}

// ============================================================================
// Persistência
// ============================================================================

const STORAGE_KEY = 'vellor-care:db'
/** Janela de agrupamento das gravações no localStorage, em ms. */
const PERSIST_DEBOUNCE_MS = 300

/** Estreita `unknown` para um objeto indexável, sem cast. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const COLLECTION_KEYS = [
  'units',
  'sectors',
  'users',
  'computers',
  'maintenances',
  'parts',
  'movements',
  'notifications',
] as const

/** Valida a forma mínima da base antes de confiar no que veio do disco. */
function isVellorDatabase(value: unknown): value is VellorDatabase {
  if (!isRecord(value)) return false
  if (typeof value.currentUserId !== 'string') return false
  return COLLECTION_KEYS.every((key) => Array.isArray(value[key]))
}

function writeStored(db: VellorDatabase): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...db, __seedVersion: SEED_VERSION }))
  } catch {
    // Cota estourada ou armazenamento bloqueado: seguimos apenas em memória.
  }
}

/** Lê a base do disco; qualquer inconsistência cai no seed em vez de quebrar a tela. */
function loadDatabase(): VellorDatabase {
  if (typeof window === 'undefined') return createSeedDatabase()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isRecord(parsed) && parsed.__seedVersion === SEED_VERSION && isVellorDatabase(parsed)) {
        return parsed
      }
    }
  } catch {
    // JSON corrompido: descartamos e recomeçamos do seed.
  }

  const seeded = createSeedDatabase()
  writeStored(seeded)
  return seeded
}

// ============================================================================
// Utilidades internas
// ============================================================================

let idCounter = 0

/** Id local previsível o bastante para depuração e único dentro da sessão. */
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}${idCounter}`
}

function nowISO(): string {
  return new Date().toISOString()
}

function todayISO(): string {
  return toISODate(new Date())
}

/** Normaliza campo de texto opcional: string vazia vira `undefined`. */
function trimmed(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined
  const clean = value.trim()
  return clean.length > 0 ? clean : undefined
}

/** Módulos que o técnico pode editar (os demais ficam somente leitura). */
const TECHNICIAN_WRITE_MODULES: ModuleKey[] = [
  'inventario',
  'preventivas',
  'calendario',
  'historico',
  'estoque',
  'saude',
]

/** Módulos administrativos, invisíveis para o perfil visualizador. */
const RESTRICTED_MODULES: ModuleKey[] = ['usuarios', 'configuracoes']

/** Matriz de permissões padrão derivada do papel do usuário. */
function buildPermissions(role: UserRole): Permission[] {
  return MODULES.map((module) => {
    if (role === 'ADMINISTRADOR') {
      return { module, read: true, write: true, remove: true }
    }
    if (role === 'TECNICO') {
      return {
        module,
        read: module !== 'usuarios',
        write: TECHNICIAN_WRITE_MODULES.includes(module),
        remove: false,
      }
    }
    return { module, read: !RESTRICTED_MODULES.includes(module), write: false, remove: false }
  })
}

/** Usuário sintético usado só se a base chegar sem nenhum usuário cadastrado. */
const FALLBACK_USER: User = {
  id: 'usuario-desconhecido',
  name: 'Usuário',
  email: 'sem-email@vellor.local',
  role: 'VISUALIZADOR',
  active: true,
  permissions: buildPermissions('VISUALIZADOR'),
  createdAt: '1970-01-01T00:00:00.000Z',
}

function resolveCurrentUser(db: VellorDatabase): User {
  return db.users.find((user) => user.id === db.currentUserId) ?? db.users[0] ?? FALLBACK_USER
}

/** Checklist zerado a partir das 21 definições padrão da preventiva. */
function buildChecklist(): MaintenanceChecklistItem[] {
  return CHECKLIST_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    group: definition.group,
    done: false,
  }))
}

function buildPhotos(urls: string[], moment: MaintenancePhoto['moment']): MaintenancePhoto[] {
  const prefix = moment === 'ANTES' ? 'Antes' : 'Depois'
  return urls
    .filter((url) => url.trim().length > 0)
    .map((url, index) => ({
      id: nextId('foto'),
      url,
      caption: `${prefix} ${index + 1}`,
      moment,
    }))
}

/** Saldo resultante de um movimento; AJUSTE grava o valor absoluto informado. */
function nextBalance(current: number, type: MovementType, quantity: number): number {
  switch (type) {
    case 'ENTRADA':
      return current + quantity
    case 'AJUSTE':
      return Math.max(0, quantity)
    case 'SAIDA':
    case 'DESCARTE':
      return Math.max(0, current - quantity)
  }
}

/** Id determinístico do alerta: mesmo motivo, mesma entidade, mesmo dia = um único registro. */
function alertId(type: AppNotification['type'], entityId: string, day: string): string {
  return `${type}:${entityId}:${day}`
}

/** Acrescenta o alerta de estoque mínimo, respeitando a deduplicação diária. */
function withLowStockAlert(
  notifications: AppNotification[],
  part: InventoryPart,
  day: string,
  createdAt: string,
): AppNotification[] {
  const id = alertId('ESTOQUE_MINIMO', part.id, day)
  if (notifications.some((notification) => notification.id === id)) return notifications

  const alert: AppNotification = {
    id,
    type: 'ESTOQUE_MINIMO',
    severity: 'AVISO',
    title: 'Estoque mínimo atingido',
    message: `${part.name} está com ${part.quantity} ${part.unit} em estoque (mínimo: ${part.minimumQuantity} ${part.unit}).`,
    partId: part.id,
    href: '/estoque',
    read: false,
    createdAt,
  }
  return [alert, ...notifications]
}

/** Campos do computador que vêm direto do formulário (o restante é gerido pelo store). */
type ComputerFormFields = Omit<
  Computer,
  'id' | 'qrPayload' | 'createdAt' | 'updatedAt' | 'lastMaintenanceAt' | 'nextMaintenanceAt' | 'health'
>

function computerFieldsFrom(input: ComputerInput): ComputerFormFields {
  return {
    assetTag: input.assetTag.trim(),
    hostname: input.hostname.trim(),
    serialNumber: input.serialNumber.trim(),
    model: input.model.trim(),
    manufacturer: input.manufacturer.trim(),
    status: input.status,
    notes: trimmed(input.notes),
    photoUrl: trimmed(input.photoUrl),
    maintenanceIntervalDays: input.maintenanceIntervalDays || DEFAULT_MAINTENANCE_INTERVAL_DAYS,
    assignment: {
      employeeName: input.assignment.employeeName.trim(),
      employeeEmail: input.assignment.employeeEmail.trim(),
      sectorId: input.assignment.sectorId,
      unit: input.assignment.unit,
      location: trimmed(input.assignment.location),
    },
    hardware: {
      processor: input.hardware.processor.trim(),
      ramGb: input.hardware.ramGb,
      ramDetail: trimmed(input.hardware.ramDetail),
      storageType: input.hardware.storageType,
      storageGb: input.hardware.storageGb,
      storageDetail: trimmed(input.hardware.storageDetail),
      gpu: trimmed(input.hardware.gpu),
      powerSupply: trimmed(input.hardware.powerSupply),
      motherboard: trimmed(input.hardware.motherboard),
      acquisitionDate: input.hardware.acquisitionDate,
    },
    system: {
      windowsVersion: input.system.windowsVersion.trim(),
      windowsBuild: input.system.windowsBuild.trim(),
      officeVersion: trimmed(input.system.officeVersion),
      antivirus: trimmed(input.system.antivirus),
      lastWindowsUpdate: trimmed(input.system.lastWindowsUpdate),
      domainJoined: input.system.domainJoined,
    },
    warranty: {
      supplier: trimmed(input.warranty.supplier),
      invoiceNumber: trimmed(input.warranty.invoiceNumber),
      warrantyUntil: trimmed(input.warranty.warrantyUntil),
      purchaseValue: input.warranty.purchaseValue,
    },
  }
}

function partFieldsFrom(input: PartInput): Omit<InventoryPart, 'id' | 'updatedAt'> {
  return {
    sku: input.sku.trim(),
    name: input.name.trim(),
    category: input.category,
    quantity: Math.max(0, Math.trunc(input.quantity)),
    minimumQuantity: Math.max(0, Math.trunc(input.minimumQuantity)),
    unit: input.unit.trim() || 'un',
    supplier: trimmed(input.supplier),
    unitValue: input.unitValue,
    location: trimmed(input.location),
    notes: trimmed(input.notes),
  }
}

function sectorFieldsFrom(input: SectorInput): Omit<Sector, 'id'> {
  return {
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    unit: input.unit.trim(),
    manager: trimmed(input.manager),
    costCenter: trimmed(input.costCenter),
    color: input.color,
  }
}

/** Mantém o cadastro de unidades sincronizado com as unidades usadas pelos setores. */
function withUnit(units: Unit[], unitName: string): Unit[] {
  const clean = unitName.trim()
  if (clean.length === 0 || units.some((unit) => unit.name === clean)) return units

  const unit: Unit = {
    id: nextId('und'),
    name: clean,
    code: clean.replace(/\s+/g, '').slice(0, 6).toUpperCase(),
  }
  return [...units, unit]
}

/** Data que ordena a manutenção nas listagens: conclusão quando existe, senão o agendamento. */
function maintenanceOrderDate(maintenance: Maintenance): string {
  return maintenance.finishedAt ?? maintenance.scheduledFor
}

// ============================================================================
// Reducer
// ============================================================================

interface StoreState {
  db: VellorDatabase
  ready: boolean
}

type StoreAction = { type: 'HYDRATE'; db: VellorDatabase } | { type: 'SET_DB'; db: VellorDatabase }

function reducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'HYDRATE':
      return { db: action.db, ready: true }
    case 'SET_DB':
      return { ...state, db: action.db }
  }
}

function createInitialState(): StoreState {
  // O seed também é o estado do SSR: o conteúdo é idêntico no servidor e no
  // primeiro render do cliente, e `ready` só vira true após a hidratação.
  return { db: createSeedDatabase(), ready: false }
}

// ============================================================================
// Provider
// ============================================================================

const VellorContext = createContext<VellorStore | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const { db, ready } = state

  /** Espelho síncrono do estado: permite encadear mutações no mesmo tique. */
  const dbRef = useRef<VellorDatabase>(state.db)
  const alertsBootstrapped = useRef(false)

  /** Aplica um updater imutável, mantém o espelho em dia e devolve a base resultante. */
  const mutate = useCallback((updater: (current: VellorDatabase) => VellorDatabase): VellorDatabase => {
    const current = dbRef.current
    const next = updater(current)
    if (next === current) return current

    dbRef.current = next
    dispatch({ type: 'SET_DB', db: next })
    return next
  }, [])

  const replaceDatabase = useCallback((next: VellorDatabase) => {
    dbRef.current = next
    dispatch({ type: 'SET_DB', db: next })
    writeStored(next)
  }, [])

  // Hidratação: só no cliente, uma única vez.
  useEffect(() => {
    const loaded = loadDatabase()
    dbRef.current = loaded
    dispatch({ type: 'HYDRATE', db: loaded })
  }, [])

  // Persistência com debounce para não gravar em rajada enquanto o usuário digita.
  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => writeStored(db), PERSIST_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [db, ready])

  // --------------------------------------------------------------------------
  // Consultas
  // --------------------------------------------------------------------------

  const currentUser = useMemo(() => resolveCurrentUser(db), [db])

  const technicians = useMemo(
    () =>
      db.users.filter(
        (user) => user.active && (user.role === 'TECNICO' || user.role === 'ADMINISTRADOR'),
      ),
    [db.users],
  )

  const unreadCount = useMemo(
    () => db.notifications.filter((notification) => !notification.read).length,
    [db.notifications],
  )

  const getComputer = useCallback(
    (id: string) => db.computers.find((computer) => computer.id === id),
    [db.computers],
  )

  const getSector = useCallback(
    (id: string) => db.sectors.find((sector) => sector.id === id),
    [db.sectors],
  )

  const getSectorName = useCallback(
    (id: string) => db.sectors.find((sector) => sector.id === id)?.name ?? '—',
    [db.sectors],
  )

  const getUser = useCallback((id: string) => db.users.find((user) => user.id === id), [db.users])

  const getPart = useCallback((id: string) => db.parts.find((part) => part.id === id), [db.parts])

  const getMaintenance = useCallback(
    (id: string) => db.maintenances.find((maintenance) => maintenance.id === id),
    [db.maintenances],
  )

  const maintenancesOfComputer = useCallback(
    (computerId: string) =>
      db.maintenances
        .filter((maintenance) => maintenance.computerId === computerId)
        .sort((a, b) => maintenanceOrderDate(b).localeCompare(maintenanceOrderDate(a))),
    [db.maintenances],
  )

  const movementsOfPart = useCallback(
    (partId: string) =>
      db.movements
        .filter((movement) => movement.partId === partId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [db.movements],
  )

  const computersOfSector = useCallback(
    (sectorId: string) =>
      db.computers.filter((computer) => computer.assignment.sectorId === sectorId),
    [db.computers],
  )

  const search = useCallback((query: string) => buildGlobalSearch(db, query), [db])

  // --------------------------------------------------------------------------
  // Computadores
  // --------------------------------------------------------------------------

  const createComputer = useCallback(
    (input: ComputerInput): Computer => {
      const id = nextId('pc')
      const timestamp = nowISO()
      const fields = computerFieldsFrom(input)

      const computer: Computer = {
        id,
        ...fields,
        qrPayload: buildAssetUrl(id),
        // Equipamento novo entra no ciclo já com a primeira preventiva agendada.
        nextMaintenanceAt: addDaysISO(todayISO(), fields.maintenanceIntervalDays),
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      mutate((current) => ({ ...current, computers: [computer, ...current.computers] }))
      toast.success(`Computador ${computer.assetTag} cadastrado.`)
      return computer
    },
    [mutate],
  )

  const updateComputer = useCallback(
    (id: string, input: ComputerInput) => {
      const existing = dbRef.current.computers.find((computer) => computer.id === id)
      if (!existing) {
        toast.error('Computador não encontrado.')
        return
      }

      const fields = computerFieldsFrom(input)
      // Mudar o intervalo reprograma a próxima preventiva a partir da última executada.
      const nextMaintenanceAt = existing.lastMaintenanceAt
        ? addDaysISO(existing.lastMaintenanceAt, fields.maintenanceIntervalDays)
        : existing.nextMaintenanceAt

      const updated: Computer = {
        ...existing,
        ...fields,
        nextMaintenanceAt,
        updatedAt: nowISO(),
      }

      mutate((current) => ({
        ...current,
        computers: current.computers.map((computer) => (computer.id === id ? updated : computer)),
      }))
      toast.success(`Computador ${updated.assetTag} atualizado.`)
    },
    [mutate],
  )

  const deleteComputer = useCallback(
    (id: string) => {
      const existing = dbRef.current.computers.find((computer) => computer.id === id)
      if (!existing) {
        toast.error('Computador não encontrado.')
        return
      }

      // Remove em cascata para não deixar manutenções e alertas órfãos nas telas.
      mutate((current) => ({
        ...current,
        computers: current.computers.filter((computer) => computer.id !== id),
        maintenances: current.maintenances.filter((maintenance) => maintenance.computerId !== id),
        notifications: current.notifications.filter(
          (notification) => notification.computerId !== id,
        ),
      }))
      toast.success(`Computador ${existing.assetTag} excluído.`)
    },
    [mutate],
  )

  const updateHealth = useCallback(
    (computerId: string, snapshot: Omit<HealthSnapshot, 'computerId'>) => {
      const existing = dbRef.current.computers.find((computer) => computer.id === computerId)
      if (!existing) {
        toast.error('Computador não encontrado.')
        return
      }

      const health: HealthSnapshot = { computerId, ...snapshot }
      const timestamp = nowISO()

      mutate((current) => ({
        ...current,
        computers: current.computers.map(
          (computer): Computer =>
            computer.id === computerId ? { ...computer, health, updatedAt: timestamp } : computer,
        ),
      }))
      toast.success(`Telemetria de ${existing.hostname} atualizada.`)
    },
    [mutate],
  )

  // --------------------------------------------------------------------------
  // Manutenções
  // --------------------------------------------------------------------------

  const createMaintenance = useCallback(
    (input: MaintenanceInput): Maintenance => {
      const snapshot = dbRef.current
      const computer = snapshot.computers.find((item) => item.id === input.computerId)
      const technician = snapshot.users.find((user) => user.id === input.technicianId)
      const timestamp = nowISO()

      const maintenance: Maintenance = {
        id: nextId('mnt'),
        computerId: input.computerId,
        assetTag: computer?.assetTag ?? '—',
        hostname: computer?.hostname ?? '—',
        sectorId: computer?.assignment.sectorId ?? '',
        technicianId: input.technicianId,
        technicianName: technician?.name ?? '—',
        type: input.type,
        status: 'AGENDADA',
        priority: input.priority,
        scheduledFor: input.scheduledFor,
        checklist: input.type === 'PREVENTIVA' ? buildChecklist() : [],
        parts: [],
        photos: [],
        notes: trimmed(input.notes),
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      mutate((current) => ({ ...current, maintenances: [maintenance, ...current.maintenances] }))
      toast.success(`Manutenção agendada para ${maintenance.assetTag}.`)
      return maintenance
    },
    [mutate],
  )

  const startMaintenance = useCallback(
    (id: string) => {
      const snapshot = dbRef.current
      const maintenance = snapshot.maintenances.find((item) => item.id === id)
      if (!maintenance) {
        toast.error('Manutenção não encontrada.')
        return
      }
      if (maintenance.status === 'CONCLUIDA') {
        toast.error('Esta manutenção já foi concluída.')
        return
      }

      const timestamp = nowISO()

      mutate((current) => ({
        ...current,
        maintenances: current.maintenances.map(
          (item): Maintenance =>
            item.id === id
              ? {
                  ...item,
                  status: 'EM_ANDAMENTO',
                  startedAt: timestamp,
                  updatedAt: timestamp,
                }
              : item,
        ),
        computers: current.computers.map(
          (computer): Computer =>
            computer.id === maintenance.computerId
              ? { ...computer, status: 'EM_MANUTENCAO', updatedAt: timestamp }
              : computer,
        ),
      }))
      toast.success(`Manutenção de ${maintenance.assetTag} iniciada.`)
    },
    [mutate],
  )

  const completeMaintenance = useCallback(
    (id: string, payload: CompleteMaintenancePayload) => {
      const snapshot = dbRef.current
      const maintenance = snapshot.maintenances.find((item) => item.id === id)
      if (!maintenance) {
        toast.error('Manutenção não encontrada.')
        return
      }

      const actor = resolveCurrentUser(snapshot)
      const finishedAt = nowISO()
      const day = todayISO()

      mutate((current) => {
        const parts = [...current.parts]
        const movements: InventoryMovement[] = []
        const usages: MaintenancePartUsage[] = []
        let notifications = current.notifications

        // 2. Baixa das peças utilizadas, com trava em zero e rastro no ledger.
        payload.parts.forEach((usage) => {
          const index = parts.findIndex((part) => part.id === usage.partId)
          if (index < 0) return

          const part = parts[index]
          const requested = Math.max(0, Math.trunc(usage.quantity))
          if (requested === 0) return

          const balanceAfter = Math.max(0, part.quantity - requested)
          const shortage = requested - (part.quantity - balanceAfter)
          const updatedPart: InventoryPart = {
            ...part,
            quantity: balanceAfter,
            updatedAt: finishedAt,
          }
          parts[index] = updatedPart

          movements.push({
            id: nextId('mov'),
            partId: part.id,
            partName: part.name,
            type: 'SAIDA',
            quantity: requested,
            balanceAfter,
            maintenanceId: maintenance.id,
            computerAssetTag: maintenance.assetTag,
            userId: actor.id,
            userName: actor.name,
            reason:
              shortage > 0
                ? `Baixa da manutenção ${maintenance.assetTag}. Saldo insuficiente: faltaram ${shortage} ${part.unit}, saldo travado em 0.`
                : `Baixa automática pela manutenção ${maintenance.assetTag}.`,
            createdAt: finishedAt,
          })

          usages.push({
            partId: part.id,
            partName: part.name,
            quantity: requested,
            unitCost: part.unitValue,
          })

          // 4. Alerta de estoque mínimo, deduplicado por peça e por dia.
          if (updatedPart.quantity <= updatedPart.minimumQuantity) {
            notifications = withLowStockAlert(notifications, updatedPart, day, finishedAt)
          }
        })

        // 1. Fechamento da ordem de serviço.
        const completed: Maintenance = {
          ...maintenance,
          status: 'CONCLUIDA',
          startedAt: maintenance.startedAt ?? finishedAt,
          finishedAt,
          durationMinutes: payload.durationMinutes,
          checklist: payload.checklist,
          parts: usages,
          photos: [
            ...buildPhotos(payload.photosBefore, 'ANTES'),
            ...buildPhotos(payload.photosAfter, 'DEPOIS'),
          ],
          notes: trimmed(payload.notes) ?? maintenance.notes,
          signatureDataUrl: payload.signatureDataUrl,
          updatedAt: finishedAt,
        }

        // 3. Computador volta a operar e recebe o próximo ciclo de preventiva.
        const computers = current.computers.map((computer): Computer => {
          if (computer.id !== maintenance.computerId) return computer
          const interval = computer.maintenanceIntervalDays || DEFAULT_MAINTENANCE_INTERVAL_DAYS
          return {
            ...computer,
            status: 'ATIVO',
            lastMaintenanceAt: finishedAt,
            nextMaintenanceAt:
              maintenance.type === 'PREVENTIVA'
                ? addDaysISO(day, interval)
                : computer.nextMaintenanceAt,
            updatedAt: finishedAt,
          }
        })

        return {
          ...current,
          maintenances: current.maintenances.map((item) => (item.id === id ? completed : item)),
          computers,
          parts,
          movements: [...movements, ...current.movements],
          notifications,
        }
      })

      // 5. Feedback ao técnico.
      toast.success(`Manutenção de ${maintenance.assetTag} concluída.`)
    },
    [mutate],
  )

  const cancelMaintenance = useCallback(
    (id: string, reason?: string) => {
      const snapshot = dbRef.current
      const maintenance = snapshot.maintenances.find((item) => item.id === id)
      if (!maintenance) {
        toast.error('Manutenção não encontrada.')
        return
      }
      if (maintenance.status === 'CONCLUIDA') {
        toast.error('Uma manutenção concluída não pode ser cancelada.')
        return
      }

      const timestamp = nowISO()
      const motive = trimmed(reason)
      const notes = motive
        ? [maintenance.notes, `Cancelamento: ${motive}`].filter(Boolean).join('\n')
        : maintenance.notes
      const wasRunning = maintenance.status === 'EM_ANDAMENTO'

      mutate((current) => ({
        ...current,
        maintenances: current.maintenances.map(
          (item): Maintenance =>
            item.id === id
              ? { ...item, status: 'CANCELADA', notes, updatedAt: timestamp }
              : item,
        ),
        // Se o equipamento estava travado nesta ordem, ele volta a ficar disponível.
        computers: wasRunning
          ? current.computers.map(
              (computer): Computer =>
                computer.id === maintenance.computerId && computer.status === 'EM_MANUTENCAO'
                  ? { ...computer, status: 'ATIVO', updatedAt: timestamp }
                  : computer,
            )
          : current.computers,
      }))
      toast.success(`Manutenção de ${maintenance.assetTag} cancelada.`)
    },
    [mutate],
  )

  const rescheduleMaintenance = useCallback(
    (id: string, scheduledFor: string) => {
      const maintenance = dbRef.current.maintenances.find((item) => item.id === id)
      if (!maintenance) {
        toast.error('Manutenção não encontrada.')
        return
      }

      const timestamp = nowISO()

      mutate((current) => ({
        ...current,
        maintenances: current.maintenances.map(
          (item): Maintenance =>
            item.id === id
              ? {
                  ...item,
                  scheduledFor,
                  // Reagendar tira a ordem do estado de atraso.
                  status: item.status === 'ATRASADA' ? 'AGENDADA' : item.status,
                  updatedAt: timestamp,
                }
              : item,
        ),
      }))
      toast.success(`Manutenção de ${maintenance.assetTag} reagendada.`)
    },
    [mutate],
  )

  const deleteMaintenance = useCallback(
    (id: string) => {
      const maintenance = dbRef.current.maintenances.find((item) => item.id === id)
      if (!maintenance) {
        toast.error('Manutenção não encontrada.')
        return
      }

      mutate((current) => ({
        ...current,
        maintenances: current.maintenances.filter((item) => item.id !== id),
        notifications: current.notifications.filter(
          (notification) => notification.maintenanceId !== id,
        ),
      }))
      toast.success('Manutenção excluída.')
    },
    [mutate],
  )

  // --------------------------------------------------------------------------
  // Estoque
  // --------------------------------------------------------------------------

  const createPart = useCallback(
    (input: PartInput): InventoryPart => {
      const snapshot = dbRef.current
      const actor = resolveCurrentUser(snapshot)
      const timestamp = nowISO()
      const part: InventoryPart = {
        id: nextId('pca'),
        ...partFieldsFrom(input),
        updatedAt: timestamp,
      }

      // O saldo inicial entra como movimento para o ledger nascer consistente.
      const opening: InventoryMovement | null =
        part.quantity > 0
          ? {
              id: nextId('mov'),
              partId: part.id,
              partName: part.name,
              type: 'ENTRADA',
              quantity: part.quantity,
              balanceAfter: part.quantity,
              userId: actor.id,
              userName: actor.name,
              reason: 'Saldo inicial do cadastro.',
              createdAt: timestamp,
            }
          : null

      mutate((current) => ({
        ...current,
        parts: [part, ...current.parts],
        movements: opening ? [opening, ...current.movements] : current.movements,
      }))
      toast.success(`Peça ${part.name} cadastrada.`)
      return part
    },
    [mutate],
  )

  const updatePart = useCallback(
    (id: string, input: PartInput) => {
      const existing = dbRef.current.parts.find((part) => part.id === id)
      if (!existing) {
        toast.error('Peça não encontrada.')
        return
      }

      const updated: InventoryPart = {
        ...existing,
        ...partFieldsFrom(input),
        updatedAt: nowISO(),
      }

      mutate((current) => ({
        ...current,
        parts: current.parts.map((part) => (part.id === id ? updated : part)),
      }))
      toast.success(`Peça ${updated.name} atualizada.`)
    },
    [mutate],
  )

  const deletePart = useCallback(
    (id: string) => {
      const existing = dbRef.current.parts.find((part) => part.id === id)
      if (!existing) {
        toast.error('Peça não encontrada.')
        return
      }

      // As movimentações permanecem como histórico (o nome da peça é desnormalizado).
      mutate((current) => ({
        ...current,
        parts: current.parts.filter((part) => part.id !== id),
        notifications: current.notifications.filter((notification) => notification.partId !== id),
      }))
      toast.success(`Peça ${existing.name} excluída.`)
    },
    [mutate],
  )

  const movePart = useCallback(
    (input: MovementInput) => {
      const snapshot = dbRef.current
      const part = snapshot.parts.find((item) => item.id === input.partId)
      if (!part) {
        toast.error('Peça não encontrada.')
        return
      }

      const actor = resolveCurrentUser(snapshot)
      const timestamp = nowISO()
      const day = todayISO()
      const quantity = Math.max(0, Math.trunc(input.quantity))
      const balanceAfter = nextBalance(part.quantity, input.type, quantity)
      const maintenanceId = trimmed(input.maintenanceId)
      const linked = maintenanceId
        ? snapshot.maintenances.find((item) => item.id === maintenanceId)
        : undefined

      const updatedPart: InventoryPart = { ...part, quantity: balanceAfter, updatedAt: timestamp }
      const movement: InventoryMovement = {
        id: nextId('mov'),
        partId: part.id,
        partName: part.name,
        type: input.type,
        quantity,
        balanceAfter,
        maintenanceId,
        computerAssetTag: linked?.assetTag,
        userId: actor.id,
        userName: actor.name,
        reason: trimmed(input.reason),
        createdAt: timestamp,
      }

      mutate((current) => ({
        ...current,
        parts: current.parts.map((item) => (item.id === part.id ? updatedPart : item)),
        movements: [movement, ...current.movements],
        notifications:
          updatedPart.quantity <= updatedPart.minimumQuantity
            ? withLowStockAlert(current.notifications, updatedPart, day, timestamp)
            : current.notifications,
      }))
      toast.success(
        `${MOVEMENT_TYPE_LABELS[input.type]} registrada: ${part.name} — saldo ${balanceAfter} ${part.unit}.`,
      )
    },
    [mutate],
  )

  // --------------------------------------------------------------------------
  // Setores e usuários
  // --------------------------------------------------------------------------

  const createSector = useCallback(
    (input: SectorInput): Sector => {
      const sector: Sector = { id: nextId('set'), ...sectorFieldsFrom(input) }

      mutate((current) => ({
        ...current,
        sectors: [...current.sectors, sector],
        units: withUnit(current.units, sector.unit),
      }))
      toast.success(`Setor ${sector.name} cadastrado.`)
      return sector
    },
    [mutate],
  )

  const updateSector = useCallback(
    (id: string, input: SectorInput) => {
      const existing = dbRef.current.sectors.find((sector) => sector.id === id)
      if (!existing) {
        toast.error('Setor não encontrado.')
        return
      }

      const updated: Sector = { ...existing, ...sectorFieldsFrom(input) }

      mutate((current) => ({
        ...current,
        sectors: current.sectors.map((sector) => (sector.id === id ? updated : sector)),
        units: withUnit(current.units, updated.unit),
      }))
      toast.success(`Setor ${updated.name} atualizado.`)
    },
    [mutate],
  )

  const deleteSector = useCallback(
    (id: string) => {
      const snapshot = dbRef.current
      const existing = snapshot.sectors.find((sector) => sector.id === id)
      if (!existing) {
        toast.error('Setor não encontrado.')
        return
      }

      const linked = snapshot.computers.filter(
        (computer) => computer.assignment.sectorId === id,
      ).length
      if (linked > 0) {
        toast.error(
          `Não é possível excluir ${existing.name}: ${linked} computador(es) ainda vinculado(s).`,
        )
        return
      }

      mutate((current) => ({
        ...current,
        sectors: current.sectors.filter((sector) => sector.id !== id),
      }))
      toast.success(`Setor ${existing.name} excluído.`)
    },
    [mutate],
  )

  const createUser = useCallback(
    (input: UserInput): User => {
      const user: User = {
        id: nextId('usr'),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        sectorId: trimmed(input.sectorId),
        phone: trimmed(input.phone),
        active: input.active,
        permissions: buildPermissions(input.role),
        createdAt: nowISO(),
      }

      mutate((current) => ({ ...current, users: [...current.users, user] }))
      toast.success(`Usuário ${user.name} cadastrado.`)
      return user
    },
    [mutate],
  )

  const updateUser = useCallback(
    (id: string, input: UserInput) => {
      const existing = dbRef.current.users.find((user) => user.id === id)
      if (!existing) {
        toast.error('Usuário não encontrado.')
        return
      }

      const updated: User = {
        ...existing,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        sectorId: trimmed(input.sectorId),
        phone: trimmed(input.phone),
        active: input.active,
        // Trocar o papel redefine a matriz de permissões; manter o papel preserva ajustes finos.
        permissions:
          input.role === existing.role ? existing.permissions : buildPermissions(input.role),
      }

      mutate((current) => ({
        ...current,
        users: current.users.map((user) => (user.id === id ? updated : user)),
      }))
      toast.success(`Usuário ${updated.name} atualizado.`)
    },
    [mutate],
  )

  const deleteUser = useCallback(
    (id: string) => {
      const snapshot = dbRef.current
      const existing = snapshot.users.find((user) => user.id === id)
      if (!existing) {
        toast.error('Usuário não encontrado.')
        return
      }
      if (snapshot.currentUserId === id) {
        toast.error('Não é possível excluir o usuário conectado.')
        return
      }

      mutate((current) => ({
        ...current,
        users: current.users.filter((user) => user.id !== id),
      }))
      toast.success(`Usuário ${existing.name} excluído.`)
    },
    [mutate],
  )

  const setCurrentUser = useCallback(
    (id: string) => {
      const existing = dbRef.current.users.find((user) => user.id === id)
      if (!existing) {
        toast.error('Usuário não encontrado.')
        return
      }

      const timestamp = nowISO()

      mutate((current) => ({
        ...current,
        currentUserId: id,
        users: current.users.map(
          (user): User => (user.id === id ? { ...user, lastLoginAt: timestamp } : user),
        ),
      }))
      toast.success(`Sessão trocada para ${existing.name}.`)
    },
    [mutate],
  )

  // --------------------------------------------------------------------------
  // Notificações
  // --------------------------------------------------------------------------

  const markNotificationRead = useCallback(
    (id: string) => {
      mutate((current) => {
        const target = current.notifications.find((notification) => notification.id === id)
        if (!target || target.read) return current
        return {
          ...current,
          notifications: current.notifications.map(
            (notification): AppNotification =>
              notification.id === id ? { ...notification, read: true } : notification,
          ),
        }
      })
    },
    [mutate],
  )

  const markAllNotificationsRead = useCallback(() => {
    mutate((current) => {
      if (current.notifications.every((notification) => notification.read)) return current
      return {
        ...current,
        notifications: current.notifications.map(
          (notification): AppNotification => ({ ...notification, read: true }),
        ),
      }
    })
  }, [mutate])

  const dismissNotification = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        notifications: current.notifications.filter((notification) => notification.id !== id),
      }))
    },
    [mutate],
  )

  const refreshAlerts = useCallback(() => {
    mutate((current) => {
      const known = new Set(current.notifications.map((notification) => notification.id))
      const fresh = computeAlerts(current).filter((notification) => !known.has(notification.id))
      if (fresh.length === 0) return current
      return { ...current, notifications: [...fresh, ...current.notifications] }
    })
  }, [mutate])

  // Primeira varredura de alertas logo após a hidratação.
  useEffect(() => {
    if (!ready || alertsBootstrapped.current) return
    alertsBootstrapped.current = true
    refreshAlerts()
  }, [ready, refreshAlerts])

  // --------------------------------------------------------------------------
  // Base de dados
  // --------------------------------------------------------------------------

  const resetDatabase = useCallback(() => {
    replaceDatabase(createSeedDatabase())
    alertsBootstrapped.current = false
    toast.success('Base de demonstração restaurada.')
  }, [replaceDatabase])

  const exportDatabase = useCallback(
    () => JSON.stringify({ ...dbRef.current, __seedVersion: SEED_VERSION }, null, 2),
    [],
  )

  const importDatabase = useCallback(
    (json: string): boolean => {
      try {
        const parsed: unknown = JSON.parse(json)
        if (!isVellorDatabase(parsed)) {
          toast.error('Arquivo inválido: a estrutura não corresponde à base do Vellor Care.')
          return false
        }
        replaceDatabase(parsed)
        toast.success('Base importada com sucesso.')
        return true
      } catch {
        toast.error('Não foi possível ler o arquivo: JSON inválido.')
        return false
      }
    },
    [replaceDatabase],
  )

  // --------------------------------------------------------------------------

  const value = useMemo<VellorStore>(
    () => ({
      ready,
      db,
      currentUser,
      sectors: db.sectors,
      units: db.units,
      users: db.users,
      technicians,
      computers: db.computers,
      maintenances: db.maintenances,
      parts: db.parts,
      movements: db.movements,
      notifications: db.notifications,
      unreadCount,
      getComputer,
      getSector,
      getSectorName,
      getUser,
      getPart,
      getMaintenance,
      maintenancesOfComputer,
      movementsOfPart,
      computersOfSector,
      createComputer,
      updateComputer,
      deleteComputer,
      updateHealth,
      createMaintenance,
      startMaintenance,
      completeMaintenance,
      cancelMaintenance,
      rescheduleMaintenance,
      deleteMaintenance,
      createPart,
      updatePart,
      deletePart,
      movePart,
      createSector,
      updateSector,
      deleteSector,
      createUser,
      updateUser,
      deleteUser,
      setCurrentUser,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      refreshAlerts,
      search,
      resetDatabase,
      exportDatabase,
      importDatabase,
    }),
    [
      ready,
      db,
      currentUser,
      technicians,
      unreadCount,
      getComputer,
      getSector,
      getSectorName,
      getUser,
      getPart,
      getMaintenance,
      maintenancesOfComputer,
      movementsOfPart,
      computersOfSector,
      createComputer,
      updateComputer,
      deleteComputer,
      updateHealth,
      createMaintenance,
      startMaintenance,
      completeMaintenance,
      cancelMaintenance,
      rescheduleMaintenance,
      deleteMaintenance,
      createPart,
      updatePart,
      deletePart,
      movePart,
      createSector,
      updateSector,
      deleteSector,
      createUser,
      updateUser,
      deleteUser,
      setCurrentUser,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      refreshAlerts,
      search,
      resetDatabase,
      exportDatabase,
      importDatabase,
    ],
  )

  return <VellorContext.Provider value={value}>{children}</VellorContext.Provider>
}

/** Acesso ao store. Só funciona dentro de `<DataProvider>`. */
export function useVellor(): VellorStore {
  const context = useContext(VellorContext)
  if (!context) {
    throw new Error(
      'useVellor() precisa ser usado dentro de <DataProvider>. Envolva a árvore da aplicação com o provider em src/app/layout.tsx.',
    )
  }
  return context
}
