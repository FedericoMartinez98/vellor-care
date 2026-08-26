/**
 * Vellor Care — Serviços tipados da API REST.
 *
 * ============================================================================
 * COMO LIGAR O FRONT NO BACKEND REAL
 * ============================================================================
 * Hoje o aplicativo roda 100% com dados locais (store em `localStorage`) e
 * NENHUMA tela importa este módulo. Ele existe para documentar o contrato REST
 * e para que a virada de chave seja mecânica:
 *
 *  1. Suba o backend Spring Boot e crie o `.env.local` na raiz do front:
 *
 *         NEXT_PUBLIC_API_BASE_URL=https://api.vellorcare.com.br/api/v1
 *
 *     Sem essa variável, `API_BASE_URL` fica vazia, `isRemoteBackend()`
 *     devolve `false` e o app continua no modo local. Só ela é necessária —
 *     a variável é lida em tempo de build, então reinicie o `next dev`.
 *
 *  2. No `DataProvider` (`@/lib/store`), troque as leituras/escritas do
 *     `localStorage` por chamadas a estes serviços, mantendo as MESMAS
 *     assinaturas expostas aos componentes. Sugestão de transição suave:
 *     manter os dois caminhos e escolher por `isRemoteBackend()`, o que
 *     permite voltar ao modo local apenas removendo a variável de ambiente.
 *
 *  3. No login, `authApi.login()` já persiste o JWT (`vellor-care:token`) e
 *     todas as requisições seguintes mandam `Authorization: Bearer …`
 *     automaticamente. Em qualquer 401 o token é descartado — trate o
 *     `ApiError` com `status === 401` redirecionando para `/login`.
 *
 *  4. Erros: todo método aqui rejeita com `ApiError` (mensagem já em pt-BR),
 *     pronta para `toast.error(error.message)` do sonner.
 *
 * Os tipos de entrada vêm dos schemas Zod (`@/lib/schemas`) e os de saída do
 * modelo de domínio (`@/lib/types`), de modo que o contrato do backend fica
 * verificado pelo compilador.
 */

import { apiDownload, apiFetch, apiUpload, clearToken, setToken } from '@/lib/api/client'
import { endpoints, type ExportFormat, type ReportKey } from '@/lib/api/endpoints'
import type {
  ChecklistFormInput,
  ComputerInput,
  LoginInput,
  MaintenanceInput,
  MovementInput,
  PartInput,
  ReportFilterInput,
  RescheduleInput,
  SectorInput,
  UserInput,
} from '@/lib/schemas'
import type {
  ActivityEntry,
  AppNotification,
  AuthSession,
  Computer,
  ComputerStatus,
  DashboardMetrics,
  DurationSeriesPoint,
  GlobalSearchResult,
  HealthSnapshot,
  InventoryMovement,
  InventoryPart,
  Maintenance,
  MaintenancePhoto,
  MaintenanceStatus,
  MaintenanceType,
  MonthlySeriesPoint,
  MovementType,
  NotificationType,
  Page,
  PageRequest,
  PartCategory,
  PreventiveHealth,
  Priority,
  Sector,
  SectorSeriesPoint,
  Severity,
  StatusSeriesPoint,
  TechnicianProductivity,
  User,
  UserRole,
} from '@/lib/types'

export * from '@/lib/api/client'
export * from '@/lib/api/endpoints'

// ============================================================================
// Tipos de parâmetro e de payload
// ============================================================================

/**
 * Nota de tipagem: os filtros abaixo são intersecções com interfaces e, por
 * regra do TypeScript, interfaces não recebem índice implícito — não seriam
 * atribuíveis a `Record<string, …>`. Por isso todo call site espalha o filtro
 * (`params: { ...params }`) antes de entregá-lo a `apiFetch`.
 */
export type ComputerListParams = PageRequest & {
  q?: string
  sectorId?: string
  unit?: string
  status?: ComputerStatus
  health?: PreventiveHealth
  /** Apenas ativos com alerta de temperatura, SSD ou disco cheio. */
  critical?: boolean
}

export type MaintenanceListParams = PageRequest & {
  q?: string
  computerId?: string
  sectorId?: string
  technicianId?: string
  type?: MaintenanceType
  status?: MaintenanceStatus
  priority?: Priority
  from?: string
  to?: string
}

export type PreventiveListParams = PageRequest & {
  q?: string
  sectorId?: string
  unit?: string
  health?: PreventiveHealth
}

export interface CalendarRangeParams {
  from: string
  to: string
  sectorId?: string
  technicianId?: string
}

export type PartListParams = PageRequest & {
  q?: string
  category?: PartCategory
  /** Somente peças com quantidade <= mínimo. */
  lowStock?: boolean
}

export type MovementListParams = PageRequest & {
  type?: MovementType
  from?: string
  to?: string
}

export type NotificationListParams = PageRequest & {
  read?: boolean
  severity?: Severity
  type?: NotificationType
}

export type UserListParams = PageRequest & {
  q?: string
  role?: UserRole
  sectorId?: string
  active?: boolean
}

export interface DashboardParams {
  from?: string
  to?: string
  sectorId?: string
  /** Janela das séries mensais; padrão do backend: 12. */
  months?: number
}

/** Filtro dos relatórios; `from`/`to` são obrigatórios no formulário. */
export type ReportParams = Partial<ReportFilterInput> & PageRequest

/** Snapshot de telemetria enviado manualmente pelo técnico. */
export type HealthSnapshotInput = Omit<HealthSnapshot, 'computerId'>

export interface QrCodePayload {
  /** PNG em data URL, pronto para `<img src>`. */
  dataUrl: string
  /** Conteúdo codificado — a URL da ficha do ativo. */
  payload: string
}

/** Corpo de `POST /agent/telemetry`, enviado pelo agente Windows. */
export interface AgentTelemetryPayload extends Omit<HealthSnapshot, 'computerId' | 'source'> {
  /** O agente não conhece o UUID; o backend resolve o ativo por estes campos. */
  hostname: string
  serialNumber: string
  agentVersion: string
}

const json = (body: unknown): string => JSON.stringify(body)

// ============================================================================
// Autenticação
// ============================================================================

export const authApi = {
  /** `POST /auth/login` — autentica e persiste o JWT no navegador. */
  login: async (body: LoginInput): Promise<AuthSession> => {
    const session = await apiFetch<AuthSession>(endpoints.auth.login(), {
      method: 'POST',
      body: json({ email: body.email, password: body.password }),
    })

    setToken(session.token)
    return session
  },

  /** `POST /auth/refresh` — renova o JWT a partir do refresh token. */
  refresh: async (refreshToken: string): Promise<AuthSession> => {
    const session = await apiFetch<AuthSession>(endpoints.auth.refresh(), {
      method: 'POST',
      body: json({ refreshToken }),
    })

    setToken(session.token)
    return session
  },

  /** `GET /auth/me` — usuário da sessão corrente, com permissões. */
  me: (signal?: AbortSignal): Promise<User> =>
    apiFetch<User>(endpoints.auth.me(), { signal }),

  /** `POST /auth/logout` — invalida a sessão no servidor e limpa o token local. */
  logout: async (): Promise<void> => {
    try {
      await apiFetch<void>(endpoints.auth.logout(), { method: 'POST' })
    } finally {
      clearToken()
    }
  },
}

// ============================================================================
// Computadores
// ============================================================================

export const computersApi = {
  list: (params?: ComputerListParams, signal?: AbortSignal): Promise<Page<Computer>> =>
    apiFetch<Page<Computer>>(endpoints.computers.list(), { params: { ...params }, signal }),

  byId: (id: string, signal?: AbortSignal): Promise<Computer> =>
    apiFetch<Computer>(endpoints.computers.byId(id), { signal }),

  create: (body: ComputerInput): Promise<Computer> =>
    apiFetch<Computer>(endpoints.computers.create(), { method: 'POST', body: json(body) }),

  update: (id: string, body: ComputerInput): Promise<Computer> =>
    apiFetch<Computer>(endpoints.computers.update(id), { method: 'PUT', body: json(body) }),

  remove: (id: string): Promise<void> =>
    apiFetch<void>(endpoints.computers.remove(id), { method: 'DELETE' }),

  /** Histórico de manutenções do ativo. */
  maintenances: (id: string, params?: PageRequest): Promise<Page<Maintenance>> =>
    apiFetch<Page<Maintenance>>(endpoints.computers.maintenances(id), {
      params: { ...params },
    }),

  /** Série de telemetria do ativo, da mais recente para a mais antiga. */
  health: (id: string, params?: { from?: string; to?: string; limit?: number }): Promise<HealthSnapshot[]> =>
    apiFetch<HealthSnapshot[]>(endpoints.computers.health(id), { params: { ...params } }),

  recordHealth: (id: string, body: HealthSnapshotInput): Promise<HealthSnapshot> =>
    apiFetch<HealthSnapshot>(endpoints.computers.recordHealth(id), {
      method: 'POST',
      body: json(body),
    }),

  qrCode: (id: string): Promise<QrCodePayload> =>
    apiFetch<QrCodePayload>(endpoints.computers.qrCode(id)),

  /** Etiqueta ZPL como texto, para enviar direto à impressora Zebra. */
  label: (id: string): Promise<string> =>
    apiFetch<string>(endpoints.computers.label(id), { headers: { Accept: 'text/plain' } }),

  downloadLabel: (id: string, assetTag: string): Promise<void> =>
    apiDownload(endpoints.computers.label(id), `etiqueta-${assetTag}.zpl`),

  /** Upload da foto do equipamento; devolve o ativo com `photoUrl` atualizado. */
  uploadPhoto: (id: string, file: File): Promise<Computer> =>
    apiUpload<Computer>(endpoints.computers.photo(id), file, 'photo'),

  /**
   * Importa o .csv gerado pelo coletor Windows (`agent/vellor-agent.ps1`).
   * Cada linha vira um `HealthSnapshot` para o computador correspondente
   * (casado por assetTag/hostname); linhas sem computador cadastrado voltam
   * em `errors`, sem derrubar a importação inteira.
   */
  importTelemetryCsv: (file: File): Promise<TelemetryCsvImportResult> =>
    apiUpload<TelemetryCsvImportResult>(endpoints.computers.importTelemetry(), file, 'file'),
}

/** Resultado de `computersApi.importTelemetryCsv`. */
export interface TelemetryCsvImportResult {
  totalRows: number
  imported: number
  errors: Array<{
    line: number
    assetTag: string | null
    hostname: string | null
    reason: string
  }>
}

// ============================================================================
// Manutenções
// ============================================================================

export const maintenancesApi = {
  list: (params?: MaintenanceListParams, signal?: AbortSignal): Promise<Page<Maintenance>> =>
    apiFetch<Page<Maintenance>>(endpoints.maintenances.list(), {
      params: { ...params },
      signal,
    }),

  byId: (id: string, signal?: AbortSignal): Promise<Maintenance> =>
    apiFetch<Maintenance>(endpoints.maintenances.byId(id), { signal }),

  /** O backend materializa o checklist padrão (21 itens) na criação. */
  create: (body: MaintenanceInput): Promise<Maintenance> =>
    apiFetch<Maintenance>(endpoints.maintenances.create(), { method: 'POST', body: json(body) }),

  update: (id: string, body: MaintenanceInput): Promise<Maintenance> =>
    apiFetch<Maintenance>(endpoints.maintenances.update(id), { method: 'PUT', body: json(body) }),

  remove: (id: string): Promise<void> =>
    apiFetch<void>(endpoints.maintenances.remove(id), { method: 'DELETE' }),

  start: (id: string): Promise<Maintenance> =>
    apiFetch<Maintenance>(endpoints.maintenances.start(id), { method: 'POST' }),

  /**
   * Conclui a execução: grava checklist, peças consumidas (que dão baixa no
   * estoque), evidências e assinatura, e reprograma a próxima preventiva.
   */
  complete: (id: string, body: ChecklistFormInput): Promise<Maintenance> =>
    apiFetch<Maintenance>(endpoints.maintenances.complete(id), {
      method: 'POST',
      body: json(body),
    }),

  cancel: (id: string, reason?: string): Promise<Maintenance> =>
    apiFetch<Maintenance>(endpoints.maintenances.cancel(id), {
      method: 'POST',
      body: json({ reason }),
    }),

  reschedule: (id: string, body: Omit<RescheduleInput, 'maintenanceId'>): Promise<Maintenance> =>
    apiFetch<Maintenance>(endpoints.maintenances.reschedule(id), {
      method: 'PATCH',
      body: json(body),
    }),

  uploadPhoto: (
    id: string,
    file: File,
    moment: MaintenancePhoto['moment'],
    caption?: string,
  ): Promise<MaintenancePhoto> =>
    apiUpload<MaintenancePhoto>(endpoints.maintenances.photos(id), file, 'file', {
      moment,
      caption,
    }),
}

// ============================================================================
// Preventivas (semáforo e calendário)
// ============================================================================

export const preventivesApi = {
  /**
   * Ativos ordenados pela próxima preventiva. O semáforo em si é derivado no
   * client por `preventiveHealthOf` (`@/lib/status`), a partir de
   * `nextMaintenanceAt`.
   */
  list: (params?: PreventiveListParams, signal?: AbortSignal): Promise<Page<Computer>> =>
    apiFetch<Page<Computer>>(endpoints.preventives.list(), {
      params: { ...params },
      signal,
    }),

  /** Manutenções agendadas no intervalo, para montar o calendário mensal. */
  calendar: (params: CalendarRangeParams, signal?: AbortSignal): Promise<Maintenance[]> =>
    apiFetch<Maintenance[]>(endpoints.preventives.calendar(), {
      params: { ...params },
      signal,
    }),
}

// ============================================================================
// Setores
// ============================================================================

export const sectorsApi = {
  /** Coleção pequena e usada em todo combo de filtro: não é paginada. */
  list: (signal?: AbortSignal): Promise<Sector[]> =>
    apiFetch<Sector[]>(endpoints.sectors.list(), { signal }),

  byId: (id: string): Promise<Sector> => apiFetch<Sector>(endpoints.sectors.byId(id)),

  create: (body: SectorInput): Promise<Sector> =>
    apiFetch<Sector>(endpoints.sectors.create(), { method: 'POST', body: json(body) }),

  update: (id: string, body: SectorInput): Promise<Sector> =>
    apiFetch<Sector>(endpoints.sectors.update(id), { method: 'PUT', body: json(body) }),

  remove: (id: string): Promise<void> =>
    apiFetch<void>(endpoints.sectors.remove(id), { method: 'DELETE' }),

  /** Total de ativos, pendências e taxa de conformidade por setor. */
  summary: (params?: DashboardParams): Promise<SectorSeriesPoint[]> =>
    apiFetch<SectorSeriesPoint[]>(endpoints.sectors.summary(), { params: { ...params } }),
}

// ============================================================================
// Estoque de peças
// ============================================================================

export const partsApi = {
  list: (params?: PartListParams, signal?: AbortSignal): Promise<Page<InventoryPart>> =>
    apiFetch<Page<InventoryPart>>(endpoints.parts.list(), { params: { ...params }, signal }),

  byId: (id: string): Promise<InventoryPart> =>
    apiFetch<InventoryPart>(endpoints.parts.byId(id)),

  create: (body: PartInput): Promise<InventoryPart> =>
    apiFetch<InventoryPart>(endpoints.parts.create(), { method: 'POST', body: json(body) }),

  update: (id: string, body: PartInput): Promise<InventoryPart> =>
    apiFetch<InventoryPart>(endpoints.parts.update(id), { method: 'PUT', body: json(body) }),

  remove: (id: string): Promise<void> =>
    apiFetch<void>(endpoints.parts.remove(id), { method: 'DELETE' }),

  /** Extrato (kardex) da peça. */
  movements: (id: string, params?: MovementListParams): Promise<Page<InventoryMovement>> =>
    apiFetch<Page<InventoryMovement>>(endpoints.parts.movements(id), {
      params: { ...params },
    }),

  /** O saldo (`balanceAfter`) é calculado pelo servidor, nunca pelo client. */
  createMovement: (
    id: string,
    body: Omit<MovementInput, 'partId'>,
  ): Promise<InventoryMovement> =>
    apiFetch<InventoryMovement>(endpoints.parts.createMovement(id), {
      method: 'POST',
      body: json(body),
    }),
}

// ============================================================================
// Notificações
// ============================================================================

export const notificationsApi = {
  list: (params?: NotificationListParams, signal?: AbortSignal): Promise<Page<AppNotification>> =>
    apiFetch<Page<AppNotification>>(endpoints.notifications.list(), {
      params: { ...params },
      signal,
    }),

  markRead: (id: string): Promise<AppNotification> =>
    apiFetch<AppNotification>(endpoints.notifications.read(id), { method: 'PATCH' }),

  markAllRead: (): Promise<void> =>
    apiFetch<void>(endpoints.notifications.readAll(), { method: 'POST' }),

  remove: (id: string): Promise<void> =>
    apiFetch<void>(endpoints.notifications.remove(id), { method: 'DELETE' }),
}

// ============================================================================
// Dashboard
// ============================================================================

export const dashboardApi = {
  metrics: (params?: DashboardParams, signal?: AbortSignal): Promise<DashboardMetrics> =>
    apiFetch<DashboardMetrics>(endpoints.dashboard.metrics(), {
      params: { ...params },
      signal,
    }),

  /** Agendadas x concluídas x atrasadas por mês. */
  monthly: (params?: DashboardParams): Promise<MonthlySeriesPoint[]> =>
    apiFetch<MonthlySeriesPoint[]>(endpoints.dashboard.monthly(), {
      params: { ...params },
    }),

  sectors: (params?: DashboardParams): Promise<SectorSeriesPoint[]> =>
    apiFetch<SectorSeriesPoint[]>(endpoints.dashboard.sectors(), {
      params: { ...params },
    }),

  /** Distribuição por situação, para o gráfico de rosca. */
  status: (params?: DashboardParams): Promise<StatusSeriesPoint[]> =>
    apiFetch<StatusSeriesPoint[]>(endpoints.dashboard.status(), { params: { ...params } }),

  /** Tempo médio de manutenção por mês, em minutos. */
  duration: (params?: DashboardParams): Promise<DurationSeriesPoint[]> =>
    apiFetch<DurationSeriesPoint[]>(endpoints.dashboard.duration(), {
      params: { ...params },
    }),

  activity: (params?: DashboardParams & { limit?: number }): Promise<ActivityEntry[]> =>
    apiFetch<ActivityEntry[]>(endpoints.dashboard.activity(), { params: { ...params } }),
}

// ============================================================================
// Relatórios
// ============================================================================

export const reportsApi = {
  preventives: (params: ReportParams, signal?: AbortSignal): Promise<Page<Maintenance>> =>
    apiFetch<Page<Maintenance>>(endpoints.reports.preventives(), {
      params: { ...params },
      signal,
    }),

  computersBySector: (params?: ReportParams): Promise<SectorSeriesPoint[]> =>
    apiFetch<SectorSeriesPoint[]>(endpoints.reports.computersBySector(), {
      params: { ...params },
    }),

  computerHistory: (computerId: string, params?: ReportParams): Promise<Page<Maintenance>> =>
    apiFetch<Page<Maintenance>>(endpoints.reports.computerHistory(computerId), {
      params: { ...params },
    }),

  /** Consumo de peças no período: saídas de estoque vinculadas a manutenções. */
  partsUsage: (params?: ReportParams): Promise<Page<InventoryMovement>> =>
    apiFetch<Page<InventoryMovement>>(endpoints.reports.partsUsage(), {
      params: { ...params },
    }),

  technicianProductivity: (params?: ReportParams): Promise<TechnicianProductivity[]> =>
    apiFetch<TechnicianProductivity[]>(endpoints.reports.technicianProductivity(), {
      params: { ...params },
    }),

  /**
   * Exporta o relatório já renderizado pelo servidor e dispara o download.
   * Alternativa às exportações client-side de `@/lib/export`, úteis enquanto
   * o app roda em modo local.
   */
  export: (
    key: ReportKey,
    format: ExportFormat,
    params?: ReportParams,
    filename?: string,
  ): Promise<void> =>
    apiDownload(endpoints.reports.export(key), filename ?? `relatorio-${key}.${format}`, {
      ...params,
      format,
    }),
}

// ============================================================================
// Usuários
// ============================================================================

export const usersApi = {
  list: (params?: UserListParams, signal?: AbortSignal): Promise<Page<User>> =>
    apiFetch<Page<User>>(endpoints.users.list(), { params: { ...params }, signal }),

  byId: (id: string): Promise<User> => apiFetch<User>(endpoints.users.byId(id)),

  create: (body: UserInput): Promise<User> =>
    apiFetch<User>(endpoints.users.create(), { method: 'POST', body: json(body) }),

  update: (id: string, body: UserInput): Promise<User> =>
    apiFetch<User>(endpoints.users.update(id), { method: 'PUT', body: json(body) }),

  remove: (id: string): Promise<void> =>
    apiFetch<void>(endpoints.users.remove(id), { method: 'DELETE' }),
}

// ============================================================================
// Busca global (Cmd+K)
// ============================================================================

export const searchApi = {
  global: (q: string, limit?: number, signal?: AbortSignal): Promise<GlobalSearchResult[]> =>
    apiFetch<GlobalSearchResult[]>(endpoints.search.global(), {
      params: { q, limit },
      signal,
    }),
}

// ============================================================================
// Agente Windows
// ============================================================================

export const agentApi = {
  /** Ingestão de telemetria; o backend cria o `HealthSnapshot` com `source: 'AGENTE'`. */
  telemetry: (body: AgentTelemetryPayload): Promise<HealthSnapshot> =>
    apiFetch<HealthSnapshot>(endpoints.agent.telemetry(), { method: 'POST', body: json(body) }),
}
