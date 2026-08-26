/**
 * Vellor Care — Base de dados inicial limpa.
 */

import {
  CHECKLIST_DEFINITIONS,
  DEFAULT_MAINTENANCE_INTERVAL_DAYS,
  SECTOR_SEEDS,
} from '@/lib/constants'
import { slugify, toISODate } from '@/lib/format'
import {
  MODULES,
  type AppNotification,
  type Computer,
  type HealthSnapshot,
  type InventoryMovement,
  type InventoryPart,
  type Maintenance,
  type MaintenanceChecklistItem,
  type MaintenancePartUsage,
  type MaintenanceStatus,
  type MaintenanceType,
  type ModuleKey,
  type MovementType,
  type PartCategory,
  type Permission,
  type Priority,
  type Sector,
  type StorageType,
  type Unit,
  type User,
  type UserRole,
} from '@/lib/types'

/** Versão do dataset; incrementar invalida o cache em localStorage para limpar dados antigos. */
export const SEED_VERSION = 11

export interface VellorDatabase {
  units: Unit[]
  sectors: Sector[]
  users: User[]
  computers: Computer[]
  maintenances: Maintenance[]
  parts: InventoryPart[]
  movements: InventoryMovement[]
  notifications: AppNotification[]
  currentUserId: string
}

// ============================================================================
// Catálogos — unidades, setores e pessoas
// ============================================================================

const UNIT_SEEDS: Unit[] = [
  { id: 'unit-mtz', name: 'Matriz', code: 'MTZ', address: 'Av. Principal, 1000 — Distrito Industrial' },
  { id: 'unit-cd', name: 'Centro de Distribuição', code: 'CD', address: 'Rod. BR-101, km 42' },
  { id: 'unit-ljc', name: 'Loja Centro', code: 'LJC', address: 'Rua do Comércio, 250' },
]

const SECTOR_MANAGERS: Record<string, string> = {
  ADM: 'Cláudia Bastos',
  RH: 'Juliana Bezerra',
  FIN: 'Patrícia Furlan',
  MKT: 'Rogério Assis',
  EXP: 'Anderson Lima',
  EST: 'Márcio Delfino',
  CNF: 'Silvana Pontes',
  'ATA-ADM': 'Everton Sacchi',
  'ATA-LOG': 'Roberto Kubitschek',
  VAR: 'Adriana Petrone',
}

interface UserSeed {
  id: string
  name: string
  role: UserRole
  sectorCode?: string
  phone: string
}

const USER_SEEDS: UserSeed[] = [
  { id: 'user-admin', name: 'Administrador TI', role: 'ADMINISTRADOR', sectorCode: 'ADM', phone: '(11) 98123-4501' },
  { id: 'user-tec-bruno', name: 'Bruno Tavares', role: 'TECNICO', sectorCode: 'ADM', phone: '(11) 98123-4502' },
  { id: 'user-tec-larissa', name: 'Larissa Rocha', role: 'TECNICO', sectorCode: 'ADM', phone: '(11) 98123-4503' },
  { id: 'user-viewer-patricia', name: 'Patrícia Furlan', role: 'VISUALIZADOR', sectorCode: 'FIN', phone: '(11) 98123-4504' },
]

function permissionsFor(role: UserRole): Permission[] {
  const allModules: ModuleKey[] = [
    'dashboard',
    'inventario',
    'preventivas',
    'calendario',
    'historico',
    'estoque',
    'setores',
    'saude',
    'relatorios',
    'configuracoes',
    'usuarios',
  ]
  switch (role) {
    case 'ADMINISTRADOR':
      return allModules.map((module) => ({ module, read: true, write: true, remove: true }))
    case 'TECNICO':
      return allModules.map((module) => ({
        module,
        read: true,
        write: module !== 'configuracoes' && module !== 'usuarios',
        remove: module === 'preventivas' || module === 'estoque',
      }))
    case 'VISUALIZADOR':
      return allModules.map((module) => ({ module, read: true, write: false, remove: false }))
  }
}

function corporateEmail(name: string): string {
  if (name.toLowerCase().includes('administrador')) return 'admin@vellor.com.br'
  const parts = name.trim().split(/\s+/)
  const first = parts[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const last = parts[parts.length - 1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return `${first}.${last}@vellor.com.br`
}

/** Cria a base de dados zerada/limpa para uso operacional real */
export function createSeedDatabase(reference: Date = new Date()): VellorDatabase {
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12, 0, 0)

  const units: Unit[] = UNIT_SEEDS.map((unit) => ({ ...unit }))

  const sectors: Sector[] = SECTOR_SEEDS.map((seed, position) => ({
    id: `sector-${slugify(seed.code)}`,
    name: seed.name,
    code: seed.code,
    unit: seed.unit || 'MTZ',
    manager: SECTOR_MANAGERS[seed.code] || 'Responsável',
    costCenter: `CC-${1000 + (position + 1) * 10}`,
    color: seed.color,
  }))

  const users: User[] = USER_SEEDS.map((seed, position) => ({
    id: seed.id,
    name: seed.name,
    email: corporateEmail(seed.name),
    role: seed.role,
    sectorId: seed.sectorCode ? `sector-${slugify(seed.sectorCode)}` : undefined,
    phone: seed.phone,
    active: true,
    permissions: permissionsFor(seed.role),
    lastLoginAt: `${toISODate(today)}T09:00:00`,
    createdAt: `${toISODate(new Date(today.getTime() - 30 * 86400000))}T09:00:00`,
  }))

  return {
    units,
    sectors,
    users,
    computers: [],
    maintenances: [],
    parts: [],
    movements: [],
    notifications: [],
    currentUserId: 'user-admin',
  }
}
