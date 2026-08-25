/**
 * Vellor Care — Base de dados semente (determinística).
 *
 * Todo o conteúdo é gerado por composição a partir de catálogos declarados no
 * topo do arquivo e de um PRNG `mulberry32` com semente fixa: duas execuções com
 * a mesma data de referência produzem exatamente os mesmos registros.
 *
 * As datas são derivadas de `reference` (padrão `new Date()`), garantindo que o
 * dashboard sempre encontre preventivas atrasadas, vencendo hoje, próximas e em
 * dia — independentemente de quando o sistema for aberto.
 *
 * `createSeedDatabase` é chamada apenas no cliente (dentro de `useEffect`).
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

/** Versão do dataset; incrementar invalida o cache em localStorage. */
export const SEED_VERSION = 3

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
// PRNG determinístico
// ============================================================================

const RANDOM_SEED = 20260825

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class Rng {
  private readonly next: () => number

  constructor(seed: number) {
    this.next = mulberry32(seed)
  }

  /** Inteiro entre `min` e `max`, ambos inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pick<T>(values: readonly T[]): T {
    return values[this.int(0, values.length - 1)]
  }

  /** Token alfanumérico maiúsculo, sem caracteres ambíguos. */
  token(length: number): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < length; i += 1) result += alphabet.charAt(this.int(0, alphabet.length - 1))
    return result
  }
}

// ============================================================================
// Utilidades de data e texto
// ============================================================================

function padNumber(value: number, size: number): string {
  return String(value).padStart(size, '0')
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function shiftDays(base: Date, days: number): Date {
  const next = new Date(base.getTime())
  next.setDate(next.getDate() + days)
  return next
}

/** Serializa data e hora locais como `YYYY-MM-DDTHH:mm:00` (sem fuso, para render estável). */
function isoDateTime(value: Date): string {
  return `${toISODate(value)}T${padNumber(value.getHours(), 2)}:${padNumber(value.getMinutes(), 2)}:00`
}

function dateTimeAt(day: Date, hour: number, minute: number): string {
  return isoDateTime(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0))
}

function addMinutesTo(day: Date, hour: number, minute: number, minutes: number): string {
  return isoDateTime(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute + minutes, 0))
}

function asciiToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

function corporateEmail(name: string): string {
  const parts = name.trim().split(/\s+/)
  return `${asciiToken(parts[0])}.${asciiToken(parts[parts.length - 1])}@vellor.com.br`
}

// ============================================================================
// Catálogos — unidades, setores e pessoas
// ============================================================================

const UNIT_SEEDS: Unit[] = [
  { id: 'unit-mtz', name: 'Matriz', code: 'MTZ', address: 'Av. das Indústrias, 1200 — Distrito Industrial' },
  { id: 'unit-cd', name: 'Centro de Distribuição', code: 'CD', address: 'Rod. BR-116, km 42 — Galpão 7' },
  { id: 'unit-ljc', name: 'Loja Centro', code: 'LJC', address: 'Rua XV de Novembro, 340 — Centro' },
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

/** Colaboradores alocados aos 64 equipamentos, na ordem de geração. */
const EMPLOYEE_NAMES: string[] = [
  'Ana Carolina Souza', 'Bruno Tavares', 'Carla Menezes', 'Diego Fontes',
  'Eduarda Lima', 'Felipe Andrade', 'Gabriela Nunes', 'Henrique Barbosa',
  'Isabela Moraes', 'João Pedro Ramos', 'Karina Batista', 'Leonardo Pires',
  'Mariana Coelho', 'Nathan Vasconcelos', 'Otávio Bezerra', 'Patrícia Furtado',
  'Rodrigo Peixoto', 'Simone Aguiar', 'Thiago Marinho', 'Vanessa Quirino',
  'William Sales', 'Yasmin Cordeiro', 'Alexandre Duarte', 'Beatriz Falcão',
  'Caio Monteiro', 'Daniela Prado', 'Emerson Galvão', 'Fernanda Rezende',
  'Gustavo Siqueira', 'Helena Braga', 'Igor Sampaio', 'Juliana Bittencourt',
  'Kleber Amorim', 'Lorena Teixeira', 'Marcelo Vieira', 'Natália Guimarães',
  'Osvaldo Pacheco', 'Priscila Moura', 'Renan Cavalcanti', 'Sabrina Toledo',
  'Tarcísio Leal', 'Vitória Camargo', 'Wesley Antunes', 'Amanda Figueiredo',
  'Bernardo Lacerda', 'Cíntia Barros', 'Douglas Ferraz', 'Elaine Macedo',
  'Fábio Rangel', 'Giovana Salgado', 'Hugo Meireles', 'Ingrid Vilela',
  'Jefferson Brandão', 'Kelly Nogueira', 'Lucas Zanetti', 'Michele Dorneles',
  'Nelson Portela', 'Olívia Caldeira', 'Paulo Sérgio Freitas', 'Raquel Domingues',
  'Sérgio Bonfim', 'Talita Xavier', 'Ulisses Paiva', 'Viviane Marques',
]

interface UserSeed {
  id: string
  name: string
  role: UserRole
  sectorCode?: string
  phone: string
}

const USER_SEEDS: UserSeed[] = [
  { id: 'user-admin', name: 'Rafael Menezes', role: 'ADMINISTRADOR', sectorCode: 'ADM', phone: '(11) 98123-4501' },
  { id: 'user-tec-bruno', name: 'Bruno Carvalho', role: 'TECNICO', sectorCode: 'ADM', phone: '(11) 98123-4502' },
  { id: 'user-tec-larissa', name: 'Larissa Prado', role: 'TECNICO', sectorCode: 'ADM', phone: '(11) 98123-4503' },
  { id: 'user-tec-diego', name: 'Diego Nakamura', role: 'TECNICO', sectorCode: 'ATA-ADM', phone: '(11) 98123-4504' },
  { id: 'user-tec-camila', name: 'Camila Rocha', role: 'TECNICO', sectorCode: 'ATA-LOG', phone: '(11) 98123-4505' },
  { id: 'user-gestor-fin', name: 'Patrícia Furlan', role: 'VISUALIZADOR', sectorCode: 'FIN', phone: '(11) 98123-4506' },
  { id: 'user-gestor-exp', name: 'Anderson Lima', role: 'VISUALIZADOR', sectorCode: 'EXP', phone: '(11) 98123-4507' },
  { id: 'user-gestor-rh', name: 'Juliana Bezerra', role: 'VISUALIZADOR', sectorCode: 'RH', phone: '(11) 98123-4508' },
]

const TECHNICIAN_MODULES: ModuleKey[] = [
  'dashboard', 'inventario', 'preventivas', 'calendario', 'historico', 'estoque', 'saude',
]
const TECHNICIAN_READONLY_MODULES: ModuleKey[] = ['relatorios', 'setores']

function permissionsFor(role: UserRole): Permission[] {
  return MODULES.map((module) => {
    if (role === 'ADMINISTRADOR') return { module, read: true, write: true, remove: true }
    if (role === 'VISUALIZADOR') return { module, read: true, write: false, remove: false }
    if (TECHNICIAN_MODULES.includes(module)) return { module, read: true, write: true, remove: false }
    if (TECHNICIAN_READONLY_MODULES.includes(module)) return { module, read: true, write: false, remove: false }
    return { module, read: false, write: false, remove: false }
  })
}

// ============================================================================
// Catálogo de equipamentos
// ============================================================================

type Chassis = 'DT' | 'NB' | 'AIO'

interface StorageOption {
  type: StorageType
  sizeGb: number
}

interface ModelSpec {
  manufacturer: string
  model: string
  chassis: Chassis
  processors: string[]
  ramOptions: number[]
  storageOptions: StorageOption[]
  yearFrom: number
  yearTo: number
  motherboard: string
  priceFrom: number
  priceTo: number
}

const MODEL_CATALOG: Record<string, ModelSpec> = {
  'optiplex-3000': {
    manufacturer: 'Dell', model: 'OptiPlex 3000', chassis: 'DT',
    processors: ['Intel Core i3-12100', 'Intel Celeron J4125'],
    ramOptions: [4, 8],
    storageOptions: [
      { type: 'SSD_SATA', sizeGb: 256 }, { type: 'SSD_SATA', sizeGb: 480 },
      { type: 'HDD', sizeGb: 500 }, { type: 'HIBRIDO', sizeGb: 500 },
    ],
    yearFrom: 2019, yearTo: 2022, motherboard: 'Dell 0K240Y', priceFrom: 2100, priceTo: 3100,
  },
  'optiplex-7010': {
    manufacturer: 'Dell', model: 'OptiPlex 7010', chassis: 'DT',
    processors: ['Intel Core i5-12400'],
    ramOptions: [8, 16],
    storageOptions: [{ type: 'SSD_NVME', sizeGb: 256 }, { type: 'SSD_NVME', sizeGb: 512 }],
    yearFrom: 2023, yearTo: 2025, motherboard: 'Dell 0X7RGM', priceFrom: 3600, priceTo: 4900,
  },
  'latitude-3440': {
    manufacturer: 'Dell', model: 'Latitude 3440', chassis: 'NB',
    processors: ['Intel Core i5-1235U'],
    ramOptions: [8, 16],
    storageOptions: [{ type: 'SSD_NVME', sizeGb: 256 }, { type: 'SSD_NVME', sizeGb: 512 }],
    yearFrom: 2023, yearTo: 2025, motherboard: 'Dell 0C1PJ7', priceFrom: 3900, priceTo: 5200,
  },
  'latitude-5440': {
    manufacturer: 'Dell', model: 'Latitude 5440', chassis: 'NB',
    processors: ['Intel Core i7-1255U'],
    ramOptions: [16, 32],
    storageOptions: [{ type: 'SSD_NVME', sizeGb: 512 }, { type: 'SSD_NVME', sizeGb: 1000 }],
    yearFrom: 2024, yearTo: 2025, motherboard: 'Dell 0M4TPD', priceFrom: 6200, priceTo: 8400,
  },
  'thinkcentre-m70q': {
    manufacturer: 'Lenovo', model: 'ThinkCentre M70q', chassis: 'DT',
    processors: ['Intel Core i5-12400', 'Intel Core i3-12100'],
    ramOptions: [8, 16],
    storageOptions: [{ type: 'SSD_NVME', sizeGb: 256 }, { type: 'SSD_NVME', sizeGb: 512 }],
    yearFrom: 2022, yearTo: 2025, motherboard: 'Lenovo 3728 STD', priceFrom: 3400, priceTo: 4700,
  },
  'thinkpad-e14': {
    manufacturer: 'Lenovo', model: 'ThinkPad E14', chassis: 'NB',
    processors: ['Intel Core i5-1235U'],
    ramOptions: [8, 16],
    storageOptions: [{ type: 'SSD_NVME', sizeGb: 256 }, { type: 'SSD_NVME', sizeGb: 512 }],
    yearFrom: 2022, yearTo: 2024, motherboard: 'Lenovo LNVNB161216', priceFrom: 4100, priceTo: 5600,
  },
  'thinkpad-l14': {
    manufacturer: 'Lenovo', model: 'ThinkPad L14', chassis: 'NB',
    processors: ['Intel Core i7-1255U'],
    ramOptions: [16, 32],
    storageOptions: [{ type: 'SSD_NVME', sizeGb: 512 }, { type: 'SSD_NVME', sizeGb: 1000 }],
    yearFrom: 2023, yearTo: 2025, motherboard: 'Lenovo 21H1 STD', priceFrom: 6400, priceTo: 8900,
  },
  'prodesk-400-g9': {
    manufacturer: 'HP', model: 'ProDesk 400 G9', chassis: 'DT',
    processors: ['Intel Core i5-12400', 'Intel Core i3-12100'],
    ramOptions: [8, 16],
    storageOptions: [{ type: 'SSD_NVME', sizeGb: 256 }, { type: 'SSD_NVME', sizeGb: 512 }],
    yearFrom: 2022, yearTo: 2024, motherboard: 'HP 8949 A01', priceFrom: 3300, priceTo: 4600,
  },
  'elitebook-640': {
    manufacturer: 'HP', model: 'EliteBook 640', chassis: 'NB',
    processors: ['Intel Core i5-1235U', 'Intel Core i7-1255U'],
    ramOptions: [16],
    storageOptions: [{ type: 'SSD_NVME', sizeGb: 512 }],
    yearFrom: 2023, yearTo: 2025, motherboard: 'HP 8B42 KBC', priceFrom: 5800, priceTo: 7600,
  },
  'master-d3400': {
    manufacturer: 'Positivo', model: 'Master D3400', chassis: 'AIO',
    processors: ['Intel Core i3-12100', 'Intel Celeron J4125'],
    ramOptions: [4, 8],
    storageOptions: [{ type: 'SSD_SATA', sizeGb: 256 }, { type: 'SSD_SATA', sizeGb: 480 }, { type: 'HDD', sizeGb: 500 }],
    yearFrom: 2019, yearTo: 2022, motherboard: 'Positivo POS-PIQ87CR', priceFrom: 2400, priceTo: 3500,
  },
  'veriton-x2690g': {
    manufacturer: 'Acer', model: 'Veriton X2690G', chassis: 'DT',
    processors: ['AMD Ryzen 5 5600G', 'Intel Core i5-12400'],
    ramOptions: [8, 16],
    storageOptions: [{ type: 'SSD_SATA', sizeGb: 480 }, { type: 'HDD', sizeGb: 500 }, { type: 'SSD_SATA', sizeGb: 256 }],
    yearFrom: 2019, yearTo: 2022, motherboard: 'Acer B660H4-AD', priceFrom: 2300, priceTo: 3400,
  },
}

interface SectorProfile {
  code: string
  count: number
  /** Ciclo de modelos: a i-ésima máquina do setor usa `models[i % models.length]`. */
  models: string[]
  intervalDays: number
  locationLabel: string
  /** Setores empoeirados recebem máquinas mais antigas e preventiva mais curta. */
  dusty: boolean
}

const SECTOR_PROFILES: SectorProfile[] = [
  { code: 'ADM', count: 10, models: ['optiplex-7010', 'thinkcentre-m70q', 'prodesk-400-g9', 'optiplex-3000', 'latitude-3440'], intervalDays: DEFAULT_MAINTENANCE_INTERVAL_DAYS, locationLabel: 'Sala 2 - Baia', dusty: false },
  { code: 'RH', count: 4, models: ['thinkcentre-m70q', 'prodesk-400-g9', 'latitude-3440', 'master-d3400'], intervalDays: DEFAULT_MAINTENANCE_INTERVAL_DAYS, locationLabel: 'Sala 4 - Mesa', dusty: false },
  { code: 'FIN', count: 8, models: ['optiplex-7010', 'prodesk-400-g9', 'thinkcentre-m70q', 'latitude-5440'], intervalDays: DEFAULT_MAINTENANCE_INTERVAL_DAYS, locationLabel: 'Sala 3 - Baia', dusty: false },
  { code: 'MKT', count: 5, models: ['optiplex-7010', 'thinkcentre-m70q', 'prodesk-400-g9', 'latitude-5440', 'thinkpad-l14'], intervalDays: DEFAULT_MAINTENANCE_INTERVAL_DAYS, locationLabel: 'Sala 5 - Mesa', dusty: false },
  { code: 'EXP', count: 7, models: ['optiplex-3000', 'veriton-x2690g'], intervalDays: 60, locationLabel: 'Galpão A - Posto', dusty: true },
  { code: 'EST', count: 6, models: ['veriton-x2690g', 'optiplex-3000'], intervalDays: 60, locationLabel: 'Galpão B - Posto', dusty: true },
  { code: 'CNF', count: 6, models: ['optiplex-3000', 'prodesk-400-g9', 'veriton-x2690g'], intervalDays: DEFAULT_MAINTENANCE_INTERVAL_DAYS, locationLabel: 'Galpão A - Conferência', dusty: false },
  { code: 'ATA-ADM', count: 9, models: ['optiplex-7010', 'thinkcentre-m70q', 'prodesk-400-g9', 'thinkpad-e14', 'latitude-3440'], intervalDays: DEFAULT_MAINTENANCE_INTERVAL_DAYS, locationLabel: 'Bloco Adm - Baia', dusty: false },
  { code: 'ATA-LOG', count: 6, models: ['prodesk-400-g9', 'veriton-x2690g', 'optiplex-3000', 'thinkpad-e14'], intervalDays: DEFAULT_MAINTENANCE_INTERVAL_DAYS, locationLabel: 'Galpão CD - Posto', dusty: false },
  { code: 'VAR', count: 3, models: ['master-d3400', 'master-d3400', 'elitebook-640'], intervalDays: 120, locationLabel: 'Loja - Caixa', dusty: false },
]

// Índices globais (0..63) que recebem tratamento especial. A ordem de geração é
// a de SECTOR_PROFILES: ADM 0-9, RH 10-13, FIN 14-21, MKT 22-26, EXP 27-33,
// EST 34-39, CNF 40-45, ATA-ADM 46-54, ATA-LOG 55-60, VAR 61-63.
const STATUS_EM_MANUTENCAO = [6, 21, 38, 57]
const STATUS_RESERVA = [12, 29, 44, 61]
const STATUS_DESATIVADO = [33, 63]
/** Máquinas sem telemetria: reservas e desativadas. */
const WITHOUT_HEALTH = [...STATUS_RESERVA, ...STATUS_DESATIVADO]

const CRITICAL_SSD_HEALTH = [30, 34, 37]
const CRITICAL_CPU_TEMP = [30, 36, 58]
const CRITICAL_SSD_TEMP = [36]
const LOW_DISK_FREE = [5, 22, 34, 59]
/** Preventiva vencida: `last`/`next` em dias relativos à referência. */
const OVERDUE_PREVENTIVES: Record<number, { last: number; next: number }> = {
  3: { last: -135, next: -45 },
  9: { last: -158, next: -38 },
  17: { last: -142, next: -22 },
  24: { last: -131, next: -11 },
  31: { last: -126, next: -6 },
  40: { last: -74, next: -14 },
  48: { last: -63, next: -3 },
  55: { last: -97, next: -7 },
}
const DUE_TODAY_PREVENTIVES = [7, 26, 52]
const SOON_PREVENTIVES: Record<number, number> = {
  1: 2, 11: 5, 15: 1, 20: 7, 28: 3, 35: 6, 43: 4, 50: 2, 59: 5,
}
/** Placas dedicadas — três estações de Marketing. */
const DEDICATED_GPUS: Record<number, string> = {
  22: 'NVIDIA GeForce RTX 3050 8 GB',
  23: 'NVIDIA GeForce GTX 1650 4 GB',
  24: 'NVIDIA T400 4 GB',
}

const SUPPLIERS_BY_MANUFACTURER: Record<string, string> = {
  Dell: 'Dell Computadores do Brasil',
  Lenovo: 'Lenovo Tecnologia Brasil',
  HP: 'HP Brasil Indústria',
  Positivo: 'Positivo Tecnologia',
  Acer: 'Officer Distribuidora',
}

const OFFICE_VERSIONS = ['Microsoft 365 Apps', 'Office LTSC 2021', 'Office 2019 Home & Business', 'LibreOffice 24.2']
const ANTIVIRUS_OPTIONS = ['Microsoft Defender', 'Sophos Intercept X', 'Kaspersky Endpoint Security']

function buildComputers(rng: Rng, reference: Date): Computer[] {
  const computers: Computer[] = []
  let index = 0

  for (const profile of SECTOR_PROFILES) {
    const sectorId = `sector-${slugify(profile.code)}`
    const seed = SECTOR_SEEDS.find((item) => item.code === profile.code)
    const unit = seed ? seed.unit : UNIT_SEEDS[0].name
    const chassisCounters: Record<string, number> = { DT: 0, NB: 0, AIO: 0 }

    for (let local = 0; local < profile.count; local += 1) {
      const spec = MODEL_CATALOG[profile.models[local % profile.models.length]]
      chassisCounters[spec.chassis] += 1

      const id = `pc-${padNumber(index + 1, 4)}`
      const range = spec.yearTo - spec.yearFrom
      // Setores empoeirados ficam com o parque mais antigo de cada modelo.
      const year = spec.yearFrom + (profile.dusty ? rng.int(0, Math.floor(range / 2)) : rng.int(0, range))
      const acquisition = new Date(year, rng.int(0, 11), rng.int(1, 28))
      const acquisitionDate = toISODate(acquisition)
      const storage = rng.pick(spec.storageOptions)
      const ramGb = rng.pick(spec.ramOptions)
      const legacy = year <= 2021
      const employeeName = EMPLOYEE_NAMES[index]
      const dedicatedGpu = DEDICATED_GPUS[index]

      const status = STATUS_EM_MANUTENCAO.includes(index)
        ? 'EM_MANUTENCAO'
        : STATUS_RESERVA.includes(index)
          ? 'RESERVA'
          : STATUS_DESATIVADO.includes(index)
            ? 'DESATIVADO'
            : 'ATIVO'

      const overdue = OVERDUE_PREVENTIVES[index]
      const soon = SOON_PREVENTIVES[index]
      const nextOffset = overdue
        ? overdue.next
        : DUE_TODAY_PREVENTIVES.includes(index)
          ? 0
          : soon !== undefined
            ? soon
            : rng.int(8, profile.intervalDays)
      const lastOffset = overdue ? overdue.last : nextOffset - profile.intervalDays

      const computer: Computer = {
        id,
        assetTag: `PC-${padNumber(index + 1, 4)}`,
        hostname: `${profile.code}-${spec.chassis}-${padNumber(chassisCounters[spec.chassis], 2)}`,
        serialNumber: rng.token(10),
        model: spec.model,
        manufacturer: spec.manufacturer,
        assignment: {
          employeeName,
          employeeEmail: corporateEmail(employeeName),
          sectorId,
          unit,
          location: `${profile.locationLabel} ${padNumber(local + 1, 2)}`,
        },
        hardware: {
          processor: rng.pick(spec.processors),
          ramGb,
          ramDetail: `${ramGb <= 8 ? 1 : 2} x ${ramGb <= 8 ? ramGb : ramGb / 2} GB DDR4 3200 MHz`,
          storageType: storage.type,
          storageGb: storage.sizeGb,
          storageDetail: `${storage.sizeGb >= 1000 ? '1 TB' : `${storage.sizeGb} GB`} — ${rng.pick(['Kingston', 'Crucial', 'WD', 'Seagate', 'Samsung'])}`,
          gpu: dedicatedGpu ?? 'Integrada Intel UHD 730',
          powerSupply: spec.chassis === 'DT' ? 'Fonte interna 260 W 80 Plus Bronze' : spec.chassis === 'AIO' ? 'Fonte externa 90 W' : 'Fonte externa 65 W USB-C',
          motherboard: spec.motherboard,
          acquisitionDate,
        },
        system: {
          windowsVersion: legacy ? 'Windows 10 Pro' : 'Windows 11 Pro',
          windowsBuild: legacy ? '19045.5011' : rng.pick(['26100.2033', '22631.4460']),
          officeVersion: rng.pick(OFFICE_VERSIONS),
          antivirus: rng.pick(ANTIVIRUS_OPTIONS),
          lastWindowsUpdate: toISODate(shiftDays(reference, -rng.int(1, 70))),
          domainJoined: profile.code !== 'VAR' && rng.chance(0.92),
        },
        warranty: {
          supplier: SUPPLIERS_BY_MANUFACTURER[spec.manufacturer],
          invoiceNumber: `NF-${rng.int(100000, 999999)}`,
          warrantyUntil: toISODate(shiftDays(acquisition, 365 * rng.int(1, 3))),
          purchaseValue: Number((rng.int(spec.priceFrom, spec.priceTo) + 0.9).toFixed(2)),
        },
        status,
        qrPayload: `http://localhost:3000/inventario/${id}`,
        lastMaintenanceAt: toISODate(shiftDays(reference, lastOffset)),
        nextMaintenanceAt: toISODate(shiftDays(reference, nextOffset)),
        maintenanceIntervalDays: profile.intervalDays,
        createdAt: `${acquisitionDate}T09:00:00`,
        updatedAt: dateTimeAt(shiftDays(reference, -rng.int(0, 30)), rng.int(8, 18), rng.int(0, 59)),
      }

      if (!WITHOUT_HEALTH.includes(index)) {
        computer.health = buildHealth(rng, computer, index, reference, year, Boolean(dedicatedGpu))
      }
      if (status === 'DESATIVADO') {
        computer.notes = 'Equipamento recolhido pelo TI aguardando descarte responsável.'
      } else if (status === 'RESERVA') {
        computer.notes = 'Máquina de contingência disponível para substituição imediata.'
      }

      computers.push(computer)
      index += 1
    }
  }

  return computers
}

function buildHealth(
  rng: Rng,
  computer: Computer,
  index: number,
  reference: Date,
  acquisitionYear: number,
  hasDedicatedGpu: boolean,
): HealthSnapshot {
  const ageYears = Math.max(0, reference.getFullYear() - acquisitionYear)
  const wear = clamp(99 - ageYears * 5 - rng.int(0, 6), 62, 99)
  const uptimeHours = rng.int(2, 820)
  const diskFreePercent = LOW_DISK_FREE.includes(index) ? rng.int(8, 14) : rng.int(16, 78)

  return {
    computerId: computer.id,
    collectedAt: isoDateTime(new Date(reference.getTime() - rng.int(1, 72) * 3_600_000)),
    ssdHealthPercent: CRITICAL_SSD_HEALTH.includes(index) ? rng.int(8, 18) : wear,
    ssdPowerOnHours: ageYears * rng.int(1400, 2600) + rng.int(100, 900),
    cpuTempC: CRITICAL_CPU_TEMP.includes(index) ? rng.int(86, 94) : rng.int(38, 72),
    gpuTempC: hasDedicatedGpu ? rng.int(41, 68) : undefined,
    ssdTempC: CRITICAL_SSD_TEMP.includes(index) ? rng.int(71, 78) : rng.int(32, 52),
    cpuUsagePercent: rng.int(4, 45),
    ramUsagePercent: rng.int(28, 82),
    diskFreePercent,
    diskFreeGb: Math.round((computer.hardware.storageGb * diskFreePercent) / 100),
    uptimeHours,
    lastBootAt: isoDateTime(new Date(reference.getTime() - uptimeHours * 3_600_000)),
    source: rng.chance(0.66) ? 'AGENTE' : 'MANUAL',
  }
}

// ============================================================================
// Estoque de peças
// ============================================================================

interface PartSeed {
  id: string
  sku: string
  name: string
  category: PartCategory
  quantity: number
  minimumQuantity: number
  supplier: string
  unitValue: number
  location: string
  consumable: boolean
}

const PART_SEEDS: PartSeed[] = [
  { id: 'part-ssd-240', sku: 'SSD-240', name: 'SSD SATA 240 GB', category: 'SSD', quantity: 14, minimumQuantity: 5, supplier: 'Kabum Corporativo', unitValue: 149.9, location: 'Armário TI - A1', consumable: true },
  { id: 'part-ssd-480', sku: 'SSD-480', name: 'SSD SATA 480 GB', category: 'SSD', quantity: 9, minimumQuantity: 4, supplier: 'Kabum Corporativo', unitValue: 219.9, location: 'Armário TI - A1', consumable: true },
  { id: 'part-ssd-nvme-512', sku: 'SSD-N512', name: 'SSD NVMe 512 GB', category: 'SSD', quantity: 6, minimumQuantity: 4, supplier: 'Officer Distribuidora', unitValue: 289.9, location: 'Armário TI - A1', consumable: true },
  { id: 'part-ssd-nvme-1tb', sku: 'SSD-N1T', name: 'SSD NVMe 1 TB', category: 'SSD', quantity: 3, minimumQuantity: 3, supplier: 'Officer Distribuidora', unitValue: 489.9, location: 'Armário TI - A2', consumable: true },
  { id: 'part-hd-1tb', sku: 'HD-1T', name: 'HD SATA 1 TB 7200 RPM', category: 'HD', quantity: 5, minimumQuantity: 2, supplier: 'TecnoSul Informática', unitValue: 279.9, location: 'Armário TI - A2', consumable: true },
  { id: 'part-hd-2tb', sku: 'HD-2T', name: 'HD SATA 2 TB 7200 RPM', category: 'HD', quantity: 5, minimumQuantity: 2, supplier: 'TecnoSul Informática', unitValue: 429.9, location: 'Armário TI - A2', consumable: false },
  { id: 'part-ram-ddr4-8', sku: 'RAM-D4-8', name: 'Memória DDR4 8 GB 3200 MHz', category: 'MEMORIA_RAM', quantity: 18, minimumQuantity: 6, supplier: 'Kabum Corporativo', unitValue: 139.9, location: 'Armário TI - B1', consumable: true },
  { id: 'part-ram-ddr4-16', sku: 'RAM-D4-16', name: 'Memória DDR4 16 GB 3200 MHz', category: 'MEMORIA_RAM', quantity: 7, minimumQuantity: 4, supplier: 'Kabum Corporativo', unitValue: 259.9, location: 'Armário TI - B1', consumable: true },
  { id: 'part-ram-sodimm-8', sku: 'RAM-SO-8', name: 'Memória SODIMM DDR4 8 GB', category: 'MEMORIA_RAM', quantity: 4, minimumQuantity: 5, supplier: 'Officer Distribuidora', unitValue: 154.9, location: 'Armário TI - B1', consumable: true },
  { id: 'part-pasta-mx4', sku: 'PST-MX4', name: 'Pasta térmica Arctic MX-4 4 g', category: 'PASTA_TERMICA', quantity: 22, minimumQuantity: 8, supplier: 'Alltech Suprimentos', unitValue: 44.9, location: 'Armário TI - B2', consumable: true },
  { id: 'part-pasta-hy510', sku: 'PST-HY510', name: 'Pasta térmica HY-510 2 g', category: 'PASTA_TERMICA', quantity: 30, minimumQuantity: 10, supplier: 'Alltech Suprimentos', unitValue: 12.9, location: 'Armário TI - B2', consumable: true },
  { id: 'part-cooler-92', sku: 'CLR-92', name: 'Cooler 92 mm para gabinete', category: 'COOLER', quantity: 11, minimumQuantity: 4, supplier: 'Alltech Suprimentos', unitValue: 39.9, location: 'Armário TI - B3', consumable: true },
  { id: 'part-cooler-cpu', sku: 'CLR-1700', name: 'Cooler de CPU LGA 1200/1700', category: 'COOLER', quantity: 3, minimumQuantity: 4, supplier: 'Alltech Suprimentos', unitValue: 89.9, location: 'Armário TI - B3', consumable: true },
  { id: 'part-fonte-500', sku: 'FNT-500', name: 'Fonte ATX 500 W 80 Plus', category: 'FONTE', quantity: 6, minimumQuantity: 3, supplier: 'TecnoSul Informática', unitValue: 269.9, location: 'Prateleira TI - C1', consumable: true },
  { id: 'part-fonte-nb-65', sku: 'FNT-NB65', name: 'Fonte externa 65 W para notebook', category: 'FONTE', quantity: 8, minimumQuantity: 3, supplier: 'Officer Distribuidora', unitValue: 189.9, location: 'Prateleira TI - C1', consumable: true },
  { id: 'part-cabo-hdmi', sku: 'CBO-HDMI', name: 'Cabo HDMI 2.0 de 2 m', category: 'CABO', quantity: 25, minimumQuantity: 8, supplier: 'Alltech Suprimentos', unitValue: 29.9, location: 'Gaveta TI - D1', consumable: true },
  { id: 'part-cabo-rede', sku: 'CBO-RJ45', name: 'Cabo de rede Cat6 de 3 m', category: 'CABO', quantity: 40, minimumQuantity: 12, supplier: 'Alltech Suprimentos', unitValue: 19.9, location: 'Gaveta TI - D1', consumable: true },
  { id: 'part-cabo-forca', sku: 'CBO-PWR', name: 'Cabo de força PC 1,8 m', category: 'CABO', quantity: 17, minimumQuantity: 6, supplier: 'Alltech Suprimentos', unitValue: 16.9, location: 'Gaveta TI - D1', consumable: true },
  { id: 'part-mouse-usb', sku: 'MSE-USB', name: 'Mouse óptico USB 1000 DPI', category: 'MOUSE', quantity: 21, minimumQuantity: 8, supplier: 'Kabum Corporativo', unitValue: 34.9, location: 'Gaveta TI - D2', consumable: true },
  { id: 'part-mouse-sem-fio', sku: 'MSE-WL', name: 'Mouse sem fio 2.4 GHz', category: 'MOUSE', quantity: 5, minimumQuantity: 5, supplier: 'Kabum Corporativo', unitValue: 79.9, location: 'Gaveta TI - D2', consumable: true },
  { id: 'part-teclado-abnt', sku: 'TCL-ABNT', name: 'Teclado USB ABNT2', category: 'TECLADO', quantity: 16, minimumQuantity: 6, supplier: 'Kabum Corporativo', unitValue: 59.9, location: 'Gaveta TI - D3', consumable: true },
  { id: 'part-teclado-kit-wl', sku: 'TCL-WL', name: 'Kit teclado e mouse sem fio', category: 'TECLADO', quantity: 4, minimumQuantity: 4, supplier: 'Officer Distribuidora', unitValue: 129.9, location: 'Gaveta TI - D3', consumable: true },
  { id: 'part-monitor-24', sku: 'MON-24', name: 'Monitor LED 23,8" Full HD', category: 'MONITOR', quantity: 4, minimumQuantity: 2, supplier: 'Dell Computadores do Brasil', unitValue: 749.9, location: 'Estoque TI - Caixa 1', consumable: false },
  { id: 'part-monitor-19', sku: 'MON-19', name: 'Monitor LED 19" HD', category: 'MONITOR', quantity: 6, minimumQuantity: 2, supplier: 'Positivo Tecnologia', unitValue: 489.9, location: 'Estoque TI - Caixa 1', consumable: false },
  { id: 'part-gpu-gt1030', sku: 'GPU-GT1030', name: 'Placa de vídeo GT 1030 2 GB', category: 'PLACA_VIDEO', quantity: 2, minimumQuantity: 1, supplier: 'Officer Distribuidora', unitValue: 549.9, location: 'Estoque TI - Caixa 2', consumable: false },
  { id: 'part-adaptador-dp', sku: 'ADP-DPH', name: 'Adaptador DisplayPort para HDMI', category: 'OUTRO', quantity: 9, minimumQuantity: 4, supplier: 'Alltech Suprimentos', unitValue: 39.9, location: 'Gaveta TI - D4', consumable: true },
]

function buildParts(rng: Rng, reference: Date): InventoryPart[] {
  return PART_SEEDS.map((seed) => ({
    id: seed.id,
    sku: seed.sku,
    name: seed.name,
    category: seed.category,
    quantity: seed.quantity,
    minimumQuantity: seed.minimumQuantity,
    unit: 'un',
    supplier: seed.supplier,
    unitValue: seed.unitValue,
    location: seed.location,
    updatedAt: dateTimeAt(shiftDays(reference, -rng.int(0, 45)), rng.int(8, 18), rng.int(0, 59)),
  }))
}

// ============================================================================
// Manutenções
// ============================================================================

const CONCLUDED_PAST_COUNT = 140
const CONCLUDED_TODAY_COUNT = 12
const IN_PROGRESS_COUNT = 6
const SCHEDULED_FUTURE_COUNT = 30
const SCHEDULED_OVERDUE_COUNT = 12
const CANCELLED_COUNT = 10

const MAINTENANCE_TYPE_POOL: MaintenanceType[] = [
  ...Array<MaintenanceType>(78).fill('PREVENTIVA'),
  ...Array<MaintenanceType>(9).fill('CORRETIVA'),
  ...Array<MaintenanceType>(4).fill('INSTALACAO'),
  ...Array<MaintenanceType>(5).fill('UPGRADE'),
  ...Array<MaintenanceType>(4).fill('FORMATACAO'),
]

const NORMAL_PRIORITIES: Priority[] = ['BAIXA', 'MEDIA', 'MEDIA', 'MEDIA', 'ALTA']
const CORRECTIVE_PRIORITIES: Priority[] = ['MEDIA', 'ALTA', 'ALTA']

const MAINTENANCE_NOTES = [
  'Gabinete com acúmulo severo de poeira; recomendada revisão em 60 dias.',
  'Pasta térmica trocada — temperatura caiu 11 °C após o serviço.',
  'Usuário relatou lentidão ao abrir planilhas; limpeza de temporários resolveu.',
  'Fonte apresentou ruído leve sob carga; item em observação.',
  'Cabo de rede substituído por perda de pacotes no teste de link.',
  'Windows Update pendente aplicado durante o atendimento.',
  'Ventoinha frontal reinstalada com parafusos novos.',
  'Disco com poucos setores realocados; monitorar SMART mensalmente.',
  'Teclado substituído por desgaste das teclas ABNT2.',
  'Backup do perfil validado antes da intervenção.',
]

const CANCELLATION_NOTES = [
  'Cancelada: colaborador em férias, preventiva remarcada pelo gestor.',
  'Cancelada: equipamento devolvido ao fornecedor em garantia.',
  'Cancelada: setor em inventário, sem janela para parada.',
  'Cancelada: agendamento duplicado no calendário.',
]

const CONSUMABLE_LIMIT = 2

function checklistFor(rng: Rng, mode: 'VAZIO' | 'PARCIAL' | 'COMPLETO'): MaintenanceChecklistItem[] {
  return CHECKLIST_DEFINITIONS.map((definition) => {
    const isMeasurement = definition.measurement !== undefined
    const done =
      mode === 'VAZIO'
        ? false
        : mode === 'PARCIAL'
          ? rng.chance(0.4)
          : isMeasurement || rng.chance(0.85)

    const item: MaintenanceChecklistItem = {
      key: definition.key,
      label: definition.label,
      group: definition.group,
      done,
    }
    if (isMeasurement && done) item.value = measurementValue(rng, definition.key)
    return item
  })
}

function measurementValue(rng: Rng, key: string): number {
  if (key === 'espaco_livre_ssd') return rng.int(18, 75)
  if (key === 'temperatura_cpu') return rng.int(42, 79)
  if (key === 'temperatura_ssd') return rng.int(33, 58)
  return rng.int(1, 100)
}

function partsUsedIn(rng: Rng, parts: InventoryPart[]): MaintenancePartUsage[] {
  const consumables = parts.filter((part) => PART_SEEDS.some((seed) => seed.id === part.id && seed.consumable))
  const total = rng.int(1, CONSUMABLE_LIMIT)
  const usages: MaintenancePartUsage[] = []

  for (let i = 0; i < total; i += 1) {
    const part = rng.pick(consumables)
    if (usages.some((usage) => usage.partId === part.id)) continue
    usages.push({ partId: part.id, partName: part.name, quantity: rng.int(1, 2), unitCost: part.unitValue })
  }
  return usages
}

function buildMaintenances(
  rng: Rng,
  reference: Date,
  computers: Computer[],
  technicians: User[],
  parts: InventoryPart[],
  criticalIds: Set<string>,
): Maintenance[] {
  const drafts: Omit<Maintenance, 'id'>[] = []
  const serviceable = computers.filter((computer) => computer.status !== 'DESATIVADO')
  // Máquinas com preventiva vencida não podem ter atendimento recente no histórico.
  const overdueIds = new Set(Object.keys(OVERDUE_PREVENTIVES).map((key) => computers[Number(key)].id))
  const recentlyServiceable = serviceable.filter((computer) => !overdueIds.has(computer.id))

  const base = (
    computer: Computer,
    type: MaintenanceType,
    status: MaintenanceStatus,
    day: Date,
    checklist: MaintenanceChecklistItem[],
  ): Omit<Maintenance, 'id'> => {
    const technician = rng.pick(technicians)
    const scheduledFor = toISODate(day)
    const priority = criticalIds.has(computer.id)
      ? 'CRITICA'
      : type === 'CORRETIVA'
        ? rng.pick(CORRECTIVE_PRIORITIES)
        : rng.pick(NORMAL_PRIORITIES)

    return {
      computerId: computer.id,
      assetTag: computer.assetTag,
      hostname: computer.hostname,
      sectorId: computer.assignment.sectorId,
      technicianId: technician.id,
      technicianName: technician.name,
      type,
      status,
      priority,
      scheduledFor,
      checklist,
      parts: [],
      photos: [],
      createdAt: dateTimeAt(shiftDays(day, -rng.int(2, 12)), rng.int(8, 17), rng.int(0, 59)),
      updatedAt: dateTimeAt(day, rng.int(8, 18), rng.int(0, 59)),
    }
  }

  const concludeOn = (draft: Omit<Maintenance, 'id'>, day: Date): void => {
    const duration = rng.int(25, 145)
    const hour = rng.int(8, 15)
    const minute = rng.pick([0, 10, 15, 30, 40, 45])
    draft.durationMinutes = duration
    draft.startedAt = dateTimeAt(day, hour, minute)
    draft.finishedAt = addMinutesTo(day, hour, minute, duration)
    draft.signatureDataUrl = 'data:image/png;base64,iVBORw0KGgo='
    draft.updatedAt = draft.finishedAt
    if (rng.chance(0.4)) draft.notes = rng.pick(MAINTENANCE_NOTES)
    if (rng.chance(0.3)) draft.parts = partsUsedIn(rng, parts)
  }

  // 1. Concluídas no passado — 60% nos últimos 6 meses, o restante até 14 meses atrás.
  for (let i = 0; i < CONCLUDED_PAST_COUNT; i += 1) {
    const recent = rng.chance(0.6)
    const offset = recent ? -rng.int(1, 180) : -rng.int(181, 425)
    const pool = offset >= -130 ? recentlyServiceable : computers
    const computer = pool[(i * 7 + rng.int(0, 2)) % pool.length]
    const day = shiftDays(reference, offset)
    const draft = base(computer, rng.pick(MAINTENANCE_TYPE_POOL), 'CONCLUIDA', day, checklistFor(rng, 'COMPLETO'))
    concludeOn(draft, day)
    drafts.push(draft)
  }

  // 2. Concluídas hoje — alimentam o card "Manutenções concluídas hoje".
  for (let i = 0; i < CONCLUDED_TODAY_COUNT; i += 1) {
    const computer = recentlyServiceable[(i * 11 + 5) % recentlyServiceable.length]
    const draft = base(computer, rng.pick(MAINTENANCE_TYPE_POOL), 'CONCLUIDA', reference, checklistFor(rng, 'COMPLETO'))
    concludeOn(draft, reference)
    drafts.push(draft)
  }

  // 3. Em andamento — iniciadas hoje ou ontem, checklist parcial.
  for (let i = 0; i < IN_PROGRESS_COUNT; i += 1) {
    const computer = serviceable[(i * 17 + 3) % serviceable.length]
    const day = shiftDays(reference, rng.chance(0.7) ? 0 : -1)
    const draft = base(computer, rng.pick(MAINTENANCE_TYPE_POOL), 'EM_ANDAMENTO', day, checklistFor(rng, 'PARCIAL'))
    draft.startedAt = dateTimeAt(day, rng.int(8, 14), rng.pick([0, 15, 30, 45]))
    draft.updatedAt = draft.startedAt
    drafts.push(draft)
  }

  // 4. Agendadas para os próximos 45 dias.
  for (let i = 0; i < SCHEDULED_FUTURE_COUNT; i += 1) {
    const computer = serviceable[(i * 13 + 9) % serviceable.length]
    const day = shiftDays(reference, rng.int(1, 45))
    drafts.push(base(computer, rng.pick(MAINTENANCE_TYPE_POOL), 'AGENDADA', day, checklistFor(rng, 'VAZIO')))
  }

  // 5. Agendadas vencidas — promovidas a ATRASADA por `effectiveMaintenanceStatus`.
  for (let i = 0; i < SCHEDULED_OVERDUE_COUNT; i += 1) {
    const computer = serviceable[(i * 19 + 4) % serviceable.length]
    const day = shiftDays(reference, -rng.int(1, 40))
    drafts.push(base(computer, rng.pick(MAINTENANCE_TYPE_POOL), 'AGENDADA', day, checklistFor(rng, 'VAZIO')))
  }

  // 6. Canceladas.
  for (let i = 0; i < CANCELLED_COUNT; i += 1) {
    const computer = computers[(i * 23 + 2) % computers.length]
    const day = shiftDays(reference, -rng.int(5, 200))
    const draft = base(computer, rng.pick(MAINTENANCE_TYPE_POOL), 'CANCELADA', day, checklistFor(rng, 'VAZIO'))
    draft.notes = rng.pick(CANCELLATION_NOTES)
    drafts.push(draft)
  }

  return drafts
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || a.assetTag.localeCompare(b.assetTag))
    .map((draft, position) => ({ id: `mnt-${padNumber(position + 1, 4)}`, ...draft }))
}

// ============================================================================
// Movimentações de estoque
// ============================================================================

interface MovementDraft {
  partId: string
  partName: string
  type: MovementType
  quantity: number
  createdAt: string
  maintenanceId?: string
  computerAssetTag?: string
  userId: string
  userName: string
  reason: string
}

const ENTRY_REASONS = [
  'Reposição programada de estoque',
  'Compra emergencial aprovada pelo gestor',
  'Recebimento de pedido do fornecedor',
  'Transferência recebida do Centro de Distribuição',
]

const ADJUSTMENT_REASONS = ['Ajuste de inventário cíclico', 'Correção de contagem no armário']
const DISCARD_REASONS = ['Peça danificada em bancada', 'Item fora de validade técnica']

function buildMovements(
  rng: Rng,
  reference: Date,
  parts: InventoryPart[],
  maintenances: Maintenance[],
  users: User[],
): InventoryMovement[] {
  const drafts: MovementDraft[] = []
  const stockKeepers = users.filter((user) => user.role === 'ADMINISTRADOR' || user.role === 'TECNICO')

  for (const maintenance of maintenances) {
    if (maintenance.status !== 'CONCLUIDA') continue
    for (const usage of maintenance.parts) {
      drafts.push({
        partId: usage.partId,
        partName: usage.partName,
        type: 'SAIDA',
        quantity: usage.quantity,
        createdAt: maintenance.finishedAt ?? `${maintenance.scheduledFor}T12:00:00`,
        maintenanceId: maintenance.id,
        computerAssetTag: maintenance.assetTag,
        userId: maintenance.technicianId,
        userName: maintenance.technicianName,
        reason: 'Consumo em manutenção',
      })
    }
  }

  for (let i = 0; i < 40; i += 1) {
    const part = parts[(i * 3 + rng.int(0, 2)) % parts.length]
    const user = rng.pick(stockKeepers)
    const day = shiftDays(reference, -rng.int(3, 420))
    drafts.push({
      partId: part.id,
      partName: part.name,
      type: 'ENTRADA',
      quantity: rng.int(2, 10),
      createdAt: dateTimeAt(day, rng.int(8, 17), rng.pick([0, 15, 30, 45])),
      userId: user.id,
      userName: user.name,
      reason: rng.pick(ENTRY_REASONS),
    })
  }

  for (let i = 0; i < 6; i += 1) {
    const part = parts[(i * 5 + 1) % parts.length]
    const user = rng.pick(stockKeepers)
    const day = shiftDays(reference, -rng.int(10, 320))
    const discard = i % 2 === 0
    drafts.push({
      partId: part.id,
      partName: part.name,
      type: discard ? 'DESCARTE' : 'AJUSTE',
      quantity: discard ? rng.int(1, 2) : rng.int(1, 3),
      createdAt: dateTimeAt(day, rng.int(8, 17), rng.pick([0, 20, 40])),
      userId: user.id,
      userName: user.name,
      reason: discard ? rng.pick(DISCARD_REASONS) : rng.pick(ADJUSTMENT_REASONS),
    })
  }

  // Saldos calculados de trás para frente: o último movimento de cada peça deve
  // fechar exatamente com a quantidade atual do estoque.
  const resolved: InventoryMovement[] = []

  for (const part of parts) {
    const timeline = drafts
      .filter((draft) => draft.partId === part.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    let balance = part.quantity

    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const draft = timeline[i]
      const positive = draft.type === 'ENTRADA' || draft.type === 'AJUSTE'

      if (positive) {
        const applied = Math.min(draft.quantity, balance)
        if (applied <= 0) continue
        resolved.push({ id: '', ...draft, quantity: applied, balanceAfter: balance })
        balance -= applied
      } else {
        resolved.push({ id: '', ...draft, balanceAfter: balance })
        balance += draft.quantity
      }
    }
  }

  return resolved
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.partId.localeCompare(b.partId))
    .map((movement, position) => ({ ...movement, id: `mov-${padNumber(position + 1, 4)}` }))
}

// ============================================================================
// Montagem final
// ============================================================================

/** Monta a base completa e determinística a partir de uma data de referência. */
export function createSeedDatabase(reference: Date = new Date()): VellorDatabase {
  const rng = new Rng(RANDOM_SEED)
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12, 0, 0)

  const units: Unit[] = UNIT_SEEDS.map((unit) => ({ ...unit }))

  const sectors: Sector[] = SECTOR_SEEDS.map((seed, position) => ({
    id: `sector-${slugify(seed.code)}`,
    name: seed.name,
    code: seed.code,
    unit: seed.unit,
    manager: SECTOR_MANAGERS[seed.code],
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
    lastLoginAt: dateTimeAt(shiftDays(today, -position), rng.int(7, 19), rng.int(0, 59)),
    createdAt: `${toISODate(shiftDays(today, -(420 + position * 23)))}T09:00:00`,
  }))

  const computers = buildComputers(rng, today)

  const criticalIndexes = new Set<number>([
    ...CRITICAL_SSD_HEALTH,
    ...CRITICAL_CPU_TEMP,
    ...CRITICAL_SSD_TEMP,
    ...LOW_DISK_FREE,
    ...Object.keys(OVERDUE_PREVENTIVES)
      .map(Number)
      .filter((index) => OVERDUE_PREVENTIVES[index].last < -120),
  ])
  const criticalIds = new Set<string>(
    computers.filter((_, index) => criticalIndexes.has(index)).map((computer) => computer.id),
  )

  const parts = buildParts(rng, today)

  // Técnicos e administrador, com peso maior para Bruno (o mais produtivo).
  const byId = new Map(users.map((user) => [user.id, user]))
  const technicianPool: User[] = [
    ...Array<string>(10).fill('user-tec-bruno'),
    ...Array<string>(7).fill('user-tec-larissa'),
    ...Array<string>(6).fill('user-tec-diego'),
    ...Array<string>(5).fill('user-tec-camila'),
    ...Array<string>(2).fill('user-admin'),
  ].flatMap((id) => {
    const user = byId.get(id)
    return user ? [user] : []
  })

  const maintenances = buildMaintenances(rng, today, computers, technicianPool, parts, criticalIds)
  const movements = buildMovements(rng, today, parts, maintenances, users)

  return {
    units,
    sectors,
    users,
    computers,
    maintenances,
    parts,
    movements,
    // O store gera os alertas na hidratação via refreshAlerts(); não duplicamos a regra aqui.
    notifications: [],
    currentUserId: 'user-admin',
  }
}
