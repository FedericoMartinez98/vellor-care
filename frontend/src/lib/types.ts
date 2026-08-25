/**
 * Vellor Care — Modelo de domínio compartilhado (front-end).
 *
 * Estes tipos espelham 1:1 os DTOs expostos pela API REST do backend
 * (Spring Boot, `com.vellor.care.interfaces.rest.dto`). Qualquer mudança aqui
 * deve ser refletida lá — e vice-versa.
 *
 * Convenções:
 *  - Datas trafegam como ISO-8601 string (`2026-08-25` ou `2026-08-25T14:30:00Z`).
 *  - Identificadores são UUID string.
 *  - Enums são strings maiúsculas, iguais aos enums Java.
 */

// ============================================================================
// Enums
// ============================================================================

export const COMPUTER_STATUS = ['ATIVO', 'EM_MANUTENCAO', 'RESERVA', 'DESATIVADO'] as const
export type ComputerStatus = (typeof COMPUTER_STATUS)[number]

export const MAINTENANCE_TYPE = [
  'PREVENTIVA',
  'CORRETIVA',
  'INSTALACAO',
  'UPGRADE',
  'FORMATACAO',
] as const
export type MaintenanceType = (typeof MAINTENANCE_TYPE)[number]

export const MAINTENANCE_STATUS = [
  'AGENDADA',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'ATRASADA',
  'CANCELADA',
] as const
export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[number]

export const PRIORITY = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const
export type Priority = (typeof PRIORITY)[number]

/** Semáforo da preventiva: verde / amarelo / vermelho. */
export const PREVENTIVE_HEALTH = ['EM_DIA', 'PROXIMA', 'ATRASADA'] as const
export type PreventiveHealth = (typeof PREVENTIVE_HEALTH)[number]

export const USER_ROLE = ['ADMINISTRADOR', 'TECNICO', 'VISUALIZADOR'] as const
export type UserRole = (typeof USER_ROLE)[number]

export const NOTIFICATION_TYPE = [
  'PREVENTIVA_7_DIAS',
  'PREVENTIVA_HOJE',
  'PREVENTIVA_ATRASADA',
  'SSD_SAUDE_BAIXA',
  'TEMPERATURA_ALTA',
  'SEM_MANUTENCAO_120_DIAS',
  'ESTOQUE_MINIMO',
  'SISTEMA',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPE)[number]

export const SEVERITY = ['INFO', 'AVISO', 'CRITICO'] as const
export type Severity = (typeof SEVERITY)[number]

export const PART_CATEGORY = [
  'SSD',
  'HD',
  'MEMORIA_RAM',
  'PASTA_TERMICA',
  'COOLER',
  'FONTE',
  'CABO',
  'MOUSE',
  'TECLADO',
  'MONITOR',
  'PLACA_VIDEO',
  'OUTRO',
] as const
export type PartCategory = (typeof PART_CATEGORY)[number]

export const MOVEMENT_TYPE = ['ENTRADA', 'SAIDA', 'AJUSTE', 'DESCARTE'] as const
export type MovementType = (typeof MOVEMENT_TYPE)[number]

export const STORAGE_TYPE = ['SSD_NVME', 'SSD_SATA', 'HDD', 'HIBRIDO'] as const
export type StorageType = (typeof STORAGE_TYPE)[number]

// ============================================================================
// Organização
// ============================================================================

export interface Sector {
  id: string
  name: string
  code: string
  /** Unidade/filial a que o setor pertence. */
  unit: string
  /** Responsável pelo setor. */
  manager?: string
  costCenter?: string
  color: string
}

export interface Unit {
  id: string
  name: string
  code: string
  address?: string
}

// ============================================================================
// Usuários
// ============================================================================

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  /** Setor do colaborador (para técnicos, o setor de lotação). */
  sectorId?: string
  avatarUrl?: string
  phone?: string
  active: boolean
  /** Módulos que o perfil pode acessar; derivado do papel, sobrescrevível. */
  permissions: Permission[]
  lastLoginAt?: string
  createdAt: string
}

export const MODULES = [
  'dashboard',
  'inventario',
  'preventivas',
  'calendario',
  'historico',
  'relatorios',
  'estoque',
  'setores',
  'saude',
  'configuracoes',
  'usuarios',
] as const
export type ModuleKey = (typeof MODULES)[number]

export interface Permission {
  module: ModuleKey
  read: boolean
  write: boolean
  remove: boolean
}

// ============================================================================
// Computador
// ============================================================================

export interface ComputerHardware {
  processor: string
  ramGb: number
  ramDetail?: string
  storageType: StorageType
  storageGb: number
  storageDetail?: string
  gpu?: string
  powerSupply?: string
  motherboard?: string
  acquisitionDate: string
}

export interface ComputerSystem {
  windowsVersion: string
  windowsBuild: string
  officeVersion?: string
  antivirus?: string
  /** Última atualização de sistema aplicada. */
  lastWindowsUpdate?: string
  domainJoined: boolean
}

export interface ComputerAssignment {
  employeeName: string
  employeeEmail: string
  sectorId: string
  unit: string
  location?: string
}

export interface ComputerWarranty {
  supplier?: string
  invoiceNumber?: string
  warrantyUntil?: string
  purchaseValue?: number
}

/** Telemetria mais recente — alimentada hoje manualmente, no futuro pelo agente Windows. */
export interface HealthSnapshot {
  computerId: string
  collectedAt: string
  /** Saúde SMART do disco em %. */
  ssdHealthPercent: number
  ssdPowerOnHours?: number
  cpuTempC: number
  gpuTempC?: number
  ssdTempC: number
  cpuUsagePercent: number
  ramUsagePercent: number
  diskFreePercent: number
  diskFreeGb: number
  /** Uptime em horas. */
  uptimeHours: number
  lastBootAt: string
  /** Origem do dado: MANUAL (técnico) ou AGENTE (agente Windows). */
  source: 'MANUAL' | 'AGENTE'
}

export interface Computer {
  id: string
  // Identificação
  assetTag: string
  hostname: string
  serialNumber: string
  model: string
  manufacturer: string
  // Blocos
  assignment: ComputerAssignment
  hardware: ComputerHardware
  system: ComputerSystem
  warranty: ComputerWarranty
  status: ComputerStatus
  notes?: string
  photoUrl?: string
  /** Conteúdo codificado no QR Code patrimonial (URL da ficha). */
  qrPayload: string
  // Preventiva
  lastMaintenanceAt?: string
  nextMaintenanceAt?: string
  /** Intervalo de preventiva em dias (padrão 90). */
  maintenanceIntervalDays: number
  health?: HealthSnapshot
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Manutenção / Preventiva
// ============================================================================

export type ChecklistGroup = 'LIMPEZA' | 'TERMICA' | 'PERIFERICOS' | 'TESTES' | 'SOFTWARE' | 'MEDICOES'

export interface ChecklistItemDefinition {
  key: string
  label: string
  group: ChecklistGroup
  /** Item que exige valor numérico além do "feito". */
  measurement?: { unit: string; min?: number; max?: number }
}

export interface MaintenanceChecklistItem {
  key: string
  label: string
  group: ChecklistGroup
  done: boolean
  /** Valor medido, quando o item é uma medição (ex.: temperatura da CPU). */
  value?: number
  note?: string
}

export interface MaintenancePhoto {
  id: string
  url: string
  caption?: string
  moment: 'ANTES' | 'DEPOIS'
}

export interface MaintenancePartUsage {
  partId: string
  partName: string
  quantity: number
  unitCost?: number
}

export interface Maintenance {
  id: string
  computerId: string
  /** Desnormalizados para listagens rápidas. */
  assetTag: string
  hostname: string
  sectorId: string
  technicianId: string
  technicianName: string
  type: MaintenanceType
  status: MaintenanceStatus
  priority: Priority
  scheduledFor: string
  startedAt?: string
  finishedAt?: string
  /** Duração em minutos. */
  durationMinutes?: number
  checklist: MaintenanceChecklistItem[]
  parts: MaintenancePartUsage[]
  photos: MaintenancePhoto[]
  notes?: string
  /** Assinatura do técnico em data-URL (PNG). */
  signatureDataUrl?: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Estoque de peças
// ============================================================================

export interface InventoryPart {
  id: string
  sku: string
  name: string
  category: PartCategory
  quantity: number
  minimumQuantity: number
  unit: string
  supplier?: string
  unitValue: number
  location?: string
  notes?: string
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  partId: string
  partName: string
  type: MovementType
  quantity: number
  /** Saldo após o movimento. */
  balanceAfter: number
  maintenanceId?: string
  computerAssetTag?: string
  userId: string
  userName: string
  reason?: string
  createdAt: string
}

// ============================================================================
// Notificações
// ============================================================================

export interface AppNotification {
  id: string
  type: NotificationType
  severity: Severity
  title: string
  message: string
  computerId?: string
  maintenanceId?: string
  partId?: string
  /** Rota para onde o clique deve navegar. */
  href?: string
  read: boolean
  createdAt: string
}

// ============================================================================
// Agregados de dashboard / relatórios
// ============================================================================

export interface DashboardMetrics {
  totalComputers: number
  computersByStatus: Record<ComputerStatus, number>
  preventivesThisMonth: number
  preventivesThisMonthDone: number
  overduePreventives: number
  completedToday: number
  criticalComputers: number
  averageMaintenanceMinutes: number
  complianceRate: number
}

export interface MonthlySeriesPoint {
  month: string
  agendadas: number
  concluidas: number
  atrasadas: number
}

export interface SectorSeriesPoint {
  sectorId: string
  sector: string
  total: number
  emDia: number
  pendentes: number
  atrasadas: number
  concluidas: number
  compliance: number
}

export interface StatusSeriesPoint {
  status: MaintenanceStatus
  label: string
  value: number
  color: string
}

export interface DurationSeriesPoint {
  month: string
  minutos: number
}

export interface ActivityEntry {
  id: string
  maintenanceId: string
  computerLabel: string
  computerId: string
  technicianName: string
  service: string
  type: MaintenanceType
  status: MaintenanceStatus
  date: string
}

export interface TechnicianProductivity {
  technicianId: string
  technicianName: string
  total: number
  concluidas: number
  averageMinutes: number
  partsUsed: number
}

// ============================================================================
// Utilidades de API
// ============================================================================

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PageRequest {
  page?: number
  size?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface AuthSession {
  token: string
  refreshToken?: string
  user: User
  expiresAt: string
}

/** Resultado da busca global (Cmd+K). */
export interface GlobalSearchResult {
  id: string
  kind: 'COMPUTADOR' | 'MANUTENCAO' | 'PECA' | 'SETOR' | 'USUARIO' | 'PAGINA'
  title: string
  subtitle?: string
  href: string
}
