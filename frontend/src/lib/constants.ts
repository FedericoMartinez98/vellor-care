/**
 * Vellor Care — Dicionário de constantes, rótulos (pt-BR) e regras de aparência.
 *
 * Fonte única de verdade para navegação, checklist de preventiva, tradução de
 * enums e mapeamento enum → tom visual (badge/pontinho). Nenhuma cor
 * hard-coded: apenas tokens do tema definidos em `src/app/globals.css`.
 */

import {
  Activity,
  Building2,
  CalendarDays,
  FileBarChart,
  History,
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  Settings,
  ShieldCheck,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react'

import type {
  ChecklistGroup,
  ChecklistItemDefinition,
  ComputerStatus,
  MaintenanceStatus,
  MaintenanceType,
  ModuleKey,
  MovementType,
  NotificationType,
  PartCategory,
  PreventiveHealth,
  Priority,
  Sector,
  Severity,
  StorageType,
  UserRole,
} from '@/lib/types'

// ============================================================================
// Navegação
// ============================================================================

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  module: ModuleKey
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, module: 'dashboard' },
  { label: 'Inventário', href: '/inventario', icon: MonitorSmartphone, module: 'inventario' },
  { label: 'Importar Telemetria', href: '/importar-telemetria', icon: UploadCloud, module: 'inventario' },
  { label: 'Preventivas', href: '/preventivas', icon: ShieldCheck, module: 'preventivas' },
  { label: 'Calendário', href: '/calendario', icon: CalendarDays, module: 'calendario' },
  { label: 'Histórico', href: '/historico', icon: History, module: 'historico' },
  { label: 'Relatórios', href: '/relatorios', icon: FileBarChart, module: 'relatorios' },
  { label: 'Estoque de Peças', href: '/estoque', icon: Package, module: 'estoque' },
  { label: 'Setores', href: '/setores', icon: Building2, module: 'setores' },
  { label: 'Saúde', href: '/saude', icon: Activity, module: 'saude' },
  { label: 'Configurações', href: '/configuracoes', icon: Settings, module: 'configuracoes' },
]

// ============================================================================
// Checklist da preventiva
// ============================================================================

export const CHECKLIST_GROUP_LABELS: Record<ChecklistGroup, string> = {
  LIMPEZA: 'Limpeza',
  TERMICA: 'Térmica',
  PERIFERICOS: 'Periféricos',
  TESTES: 'Testes',
  SOFTWARE: 'Software e atualizações',
  MEDICOES: 'Medições',
}

/** Os 21 itens padrão executados em toda manutenção preventiva. */
export const CHECKLIST_DEFINITIONS: ChecklistItemDefinition[] = [
  // Limpeza
  { key: 'limpeza_externa', label: 'Limpeza externa', group: 'LIMPEZA' },
  { key: 'limpeza_interna', label: 'Limpeza interna', group: 'LIMPEZA' },
  { key: 'limpeza_cooler', label: 'Limpeza do cooler', group: 'LIMPEZA' },
  { key: 'limpeza_ventoinhas', label: 'Limpeza das ventoinhas', group: 'LIMPEZA' },
  { key: 'limpeza_fonte', label: 'Limpeza da fonte', group: 'LIMPEZA' },
  { key: 'limpeza_filtros', label: 'Limpeza dos filtros', group: 'LIMPEZA' },
  { key: 'organizacao_cabos', label: 'Organização dos cabos', group: 'LIMPEZA' },
  // Térmica
  { key: 'troca_pasta_termica', label: 'Troca da pasta térmica', group: 'TERMICA' },
  // Periféricos
  { key: 'limpeza_teclado', label: 'Limpeza de teclado', group: 'PERIFERICOS' },
  { key: 'limpeza_mouse', label: 'Limpeza de mouse', group: 'PERIFERICOS' },
  { key: 'limpeza_monitor', label: 'Limpeza de monitor', group: 'PERIFERICOS' },
  // Testes
  { key: 'teste_internet', label: 'Teste de internet', group: 'TESTES' },
  { key: 'teste_impressora', label: 'Teste de impressora', group: 'TESTES' },
  // Software e atualizações
  { key: 'atualizacao_windows', label: 'Atualização do Windows', group: 'SOFTWARE' },
  { key: 'atualizacao_drivers', label: 'Atualização de drivers', group: 'SOFTWARE' },
  { key: 'atualizacao_bios', label: 'Atualização de BIOS', group: 'SOFTWARE' },
  { key: 'limpeza_temporarios', label: 'Limpeza de arquivos temporários', group: 'SOFTWARE' },
  { key: 'verificacao_antivirus', label: 'Verificação do antivírus', group: 'SOFTWARE' },
  // Medições
  {
    key: 'espaco_livre_ssd',
    label: 'Espaço livre no SSD',
    group: 'MEDICOES',
    measurement: { unit: '%', min: 15 },
  },
  {
    key: 'temperatura_cpu',
    label: 'Temperatura da CPU',
    group: 'MEDICOES',
    measurement: { unit: '°C', max: 85 },
  },
  {
    key: 'temperatura_ssd',
    label: 'Temperatura do SSD',
    group: 'MEDICOES',
    measurement: { unit: '°C', max: 70 },
  },
]

// ============================================================================
// Rótulos de enums (pt-BR)
// ============================================================================

export const COMPUTER_STATUS_LABELS: Record<ComputerStatus, string> = {
  ATIVO: 'Ativo',
  EM_MANUTENCAO: 'Em manutenção',
  RESERVA: 'Reserva',
  DESATIVADO: 'Desativado',
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVA: 'Preventiva',
  CORRETIVA: 'Corretiva',
  INSTALACAO: 'Instalação',
  UPGRADE: 'Upgrade',
  FORMATACAO: 'Formatação',
}

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  AGENDADA: 'Agendada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada',
  CANCELADA: 'Cancelada',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

export const PREVENTIVE_HEALTH_LABELS: Record<PreventiveHealth, string> = {
  EM_DIA: 'Em dia',
  PROXIMA: 'Próxima',
  ATRASADA: 'Atrasada',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRADOR: 'Administrador',
  TECNICO: 'Técnico',
  VISUALIZADOR: 'Visualizador',
}

export const PART_CATEGORY_LABELS: Record<PartCategory, string> = {
  SSD: 'SSD',
  HD: 'HD',
  MEMORIA_RAM: 'Memória RAM',
  PASTA_TERMICA: 'Pasta térmica',
  COOLER: 'Cooler',
  FONTE: 'Fonte',
  CABO: 'Cabo',
  MOUSE: 'Mouse',
  TECLADO: 'Teclado',
  MONITOR: 'Monitor',
  PLACA_VIDEO: 'Placa de vídeo',
  OUTRO: 'Outro',
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste',
  DESCARTE: 'Descarte',
}

export const STORAGE_TYPE_LABELS: Record<StorageType, string> = {
  SSD_NVME: 'SSD NVMe',
  SSD_SATA: 'SSD SATA',
  HDD: 'HDD',
  HIBRIDO: 'Híbrido',
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  PREVENTIVA_7_DIAS: 'Preventiva em 7 dias',
  PREVENTIVA_HOJE: 'Preventiva hoje',
  PREVENTIVA_ATRASADA: 'Preventiva atrasada',
  SSD_SAUDE_BAIXA: 'Saúde do SSD baixa',
  TEMPERATURA_ALTA: 'Temperatura alta',
  SEM_MANUTENCAO_120_DIAS: 'Sem manutenção há 120 dias',
  ESTOQUE_MINIMO: 'Estoque mínimo atingido',
  SISTEMA: 'Sistema',
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  INFO: 'Informação',
  AVISO: 'Aviso',
  CRITICO: 'Crítico',
}

// ============================================================================
// Aparência (badge + pontinho)
// ============================================================================

export type BadgeTone =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'

export interface ToneAppearance {
  label: string
  badge: BadgeTone
  /** Classe de fundo do pontinho indicador (ex.: 'bg-success'). */
  dot: string
}

export const COMPUTER_STATUS_TONE: Record<ComputerStatus, ToneAppearance> = {
  ATIVO: { label: COMPUTER_STATUS_LABELS.ATIVO, badge: 'success', dot: 'bg-success' },
  EM_MANUTENCAO: { label: COMPUTER_STATUS_LABELS.EM_MANUTENCAO, badge: 'info', dot: 'bg-info' },
  RESERVA: { label: COMPUTER_STATUS_LABELS.RESERVA, badge: 'warning', dot: 'bg-warning' },
  DESATIVADO: { label: COMPUTER_STATUS_LABELS.DESATIVADO, badge: 'danger', dot: 'bg-danger' },
}

export const MAINTENANCE_STATUS_TONE: Record<MaintenanceStatus, ToneAppearance> = {
  AGENDADA: { label: MAINTENANCE_STATUS_LABELS.AGENDADA, badge: 'warning', dot: 'bg-warning' },
  EM_ANDAMENTO: { label: MAINTENANCE_STATUS_LABELS.EM_ANDAMENTO, badge: 'info', dot: 'bg-info' },
  CONCLUIDA: { label: MAINTENANCE_STATUS_LABELS.CONCLUIDA, badge: 'success', dot: 'bg-success' },
  ATRASADA: { label: MAINTENANCE_STATUS_LABELS.ATRASADA, badge: 'danger', dot: 'bg-danger' },
  CANCELADA: { label: MAINTENANCE_STATUS_LABELS.CANCELADA, badge: 'muted', dot: 'bg-muted-foreground' },
}

export const PRIORITY_TONE: Record<Priority, ToneAppearance> = {
  BAIXA: { label: PRIORITY_LABELS.BAIXA, badge: 'muted', dot: 'bg-muted-foreground' },
  MEDIA: { label: PRIORITY_LABELS.MEDIA, badge: 'warning', dot: 'bg-warning' },
  ALTA: { label: PRIORITY_LABELS.ALTA, badge: 'destructive', dot: 'bg-destructive' },
  CRITICA: { label: PRIORITY_LABELS.CRITICA, badge: 'danger', dot: 'bg-danger' },
}

export const PREVENTIVE_HEALTH_TONE: Record<PreventiveHealth, ToneAppearance> = {
  EM_DIA: { label: PREVENTIVE_HEALTH_LABELS.EM_DIA, badge: 'success', dot: 'bg-success' },
  PROXIMA: { label: PREVENTIVE_HEALTH_LABELS.PROXIMA, badge: 'warning', dot: 'bg-warning' },
  ATRASADA: { label: PREVENTIVE_HEALTH_LABELS.ATRASADA, badge: 'danger', dot: 'bg-danger' },
}

export const SEVERITY_TONE: Record<Severity, ToneAppearance> = {
  INFO: { label: SEVERITY_LABELS.INFO, badge: 'info', dot: 'bg-info' },
  AVISO: { label: SEVERITY_LABELS.AVISO, badge: 'warning', dot: 'bg-warning' },
  CRITICO: { label: SEVERITY_LABELS.CRITICO, badge: 'danger', dot: 'bg-danger' },
}

// ============================================================================
// Gráficos
// ============================================================================

export const CHART_COLORS: string[] = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

// ============================================================================
// Regras de negócio (limiares)
// ============================================================================

/** Intervalo padrão entre preventivas, em dias. */
export const DEFAULT_MAINTENANCE_INTERVAL_DAYS = 90
/** Antecedência, em dias, para marcar a preventiva como "próxima". */
export const PREVENTIVE_WARNING_DAYS = 7
/** Temperatura de CPU considerada crítica, em °C. */
export const CRITICAL_TEMP_C = 85
/** Saúde SMART do SSD abaixo da qual o disco é considerado crítico, em %. */
export const CRITICAL_SSD_HEALTH_PERCENT = 20
/** Dias sem qualquer manutenção que disparam alerta. */
export const NO_MAINTENANCE_ALERT_DAYS = 120
/** Espaço livre em disco abaixo do qual o alerta é disparado, em %. */
export const LOW_DISK_FREE_PERCENT = 15

// ============================================================================
// Setores da empresa (seed)
// ============================================================================

export type SectorSeed = Pick<Sector, 'name' | 'code' | 'unit' | 'color'>

export const SECTOR_SEEDS: SectorSeed[] = [
  { name: 'ADM', code: 'ADM', unit: 'Matriz', color: 'var(--chart-1)' },
  { name: 'RH', code: 'RH', unit: 'Matriz', color: 'var(--chart-2)' },
  { name: 'Financeiro', code: 'FIN', unit: 'Matriz', color: 'var(--chart-3)' },
  { name: 'Marketing', code: 'MKT', unit: 'Matriz', color: 'var(--chart-4)' },
  { name: 'Expedição', code: 'EXP', unit: 'Matriz', color: 'var(--chart-5)' },
  { name: 'Estoque', code: 'EST', unit: 'Matriz', color: 'var(--chart-6)' },
  { name: 'Conferência', code: 'CNF', unit: 'Matriz', color: 'var(--chart-1)' },
  { name: 'Atacado ADM', code: 'ATA-ADM', unit: 'Centro de Distribuição', color: 'var(--chart-2)' },
  { name: 'Atacado LOG', code: 'ATA-LOG', unit: 'Centro de Distribuição', color: 'var(--chart-3)' },
  { name: 'Varejo', code: 'VAR', unit: 'Loja Centro', color: 'var(--chart-4)' },
]
