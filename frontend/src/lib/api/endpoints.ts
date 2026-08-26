/**
 * Vellor Care — Mapa dos endpoints REST do backend.
 *
 * Fonte única de verdade dos caminhos da API: nenhuma string de rota deve ser
 * escrita fora deste arquivo. Cada função devolve apenas o *path* (sem host e
 * sem query string) — a base vem de `API_BASE_URL` e os filtros vão em
 * `params`, resolvidos por `apiFetch`.
 *
 * Convenções do backend (Spring Boot):
 *  - Coleções paginadas aceitam `page`, `size`, `sort` e `direction`.
 *  - Identificadores são UUID em string.
 *  - `PUT` substitui o recurso inteiro; `PATCH` altera um aspecto específico.
 *  - `POST /{recurso}/{id}/{acao}` para transições de estado (start, complete…).
 */

/** Segmento de path escapado — ids chegam da URL/QR Code e nunca são confiáveis. */
const seg = (value: string): string => encodeURIComponent(value)

/** Relatórios disponíveis; a chave é usada também na rota de exportação. */
export const REPORT_KEYS = [
  'preventives',
  'computers-by-sector',
  'computer-history',
  'parts-usage',
  'technician-productivity',
] as const
export type ReportKey = (typeof REPORT_KEYS)[number]

/** Formatos aceitos por `GET /reports/{key}/export?format=…`. */
export const EXPORT_FORMATS = ['pdf', 'xlsx', 'csv'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

export const endpoints = {
  /**
   * Autenticação JWT.
   * `POST /auth/login` · `POST /auth/refresh` · `GET /auth/me` · `POST /auth/logout`
   */
  auth: {
    login: () => '/auth/login',
    refresh: () => '/auth/refresh',
    me: () => '/auth/me',
    logout: () => '/auth/logout',
  },

  /**
   * Inventário de computadores.
   * `GET|POST /computers` · `GET|PUT|DELETE /computers/{id}`
   * `GET /computers/{id}/maintenances` · `GET|POST /computers/{id}/health`
   * `GET /computers/{id}/qrcode` · `GET /computers/{id}/label.zpl`
   * `POST /computers/{id}/photo`
   */
  computers: {
    list: () => '/computers',
    create: () => '/computers',
    byId: (id: string) => `/computers/${seg(id)}`,
    update: (id: string) => `/computers/${seg(id)}`,
    remove: (id: string) => `/computers/${seg(id)}`,
    /** Histórico de manutenções do ativo. */
    maintenances: (id: string) => `/computers/${seg(id)}/maintenances`,
    /** `GET`: série de telemetria do ativo. */
    health: (id: string) => `/computers/${seg(id)}/health`,
    /** `POST`: registra um novo snapshot (técnico ou agente Windows). */
    recordHealth: (id: string) => `/computers/${seg(id)}/health`,
    /** QR Code patrimonial já renderizado pelo servidor. */
    qrCode: (id: string) => `/computers/${seg(id)}/qrcode`,
    /** Etiqueta pronta para impressora Zebra (text/plain, ZPL II). */
    label: (id: string) => `/computers/${seg(id)}/label.zpl`,
    /** Upload da foto do equipamento (multipart). */
    photo: (id: string) => `/computers/${seg(id)}/photo`,
    /** Importa o .csv gerado pelo coletor Windows (multipart). */
    importTelemetry: () => '/computers/import-telemetry',
  },

  /**
   * Ordens de manutenção (preventiva, corretiva, instalação…).
   * `GET|POST /maintenances` · `GET|PUT|DELETE /maintenances/{id}`
   * `POST /maintenances/{id}/start|complete|cancel`
   * `PATCH /maintenances/{id}/reschedule` · `POST /maintenances/{id}/photos`
   */
  maintenances: {
    list: () => '/maintenances',
    create: () => '/maintenances',
    byId: (id: string) => `/maintenances/${seg(id)}`,
    update: (id: string) => `/maintenances/${seg(id)}`,
    remove: (id: string) => `/maintenances/${seg(id)}`,
    /** AGENDADA → EM_ANDAMENTO; carimba `startedAt`. */
    start: (id: string) => `/maintenances/${seg(id)}/start`,
    /** EM_ANDAMENTO → CONCLUIDA; envia checklist, peças, fotos e assinatura. */
    complete: (id: string) => `/maintenances/${seg(id)}/complete`,
    cancel: (id: string) => `/maintenances/${seg(id)}/cancel`,
    /** Só altera `scheduledFor`; por isso `PATCH`. */
    reschedule: (id: string) => `/maintenances/${seg(id)}/reschedule`,
    /** Upload de evidência ANTES/DEPOIS (multipart). */
    photos: (id: string) => `/maintenances/${seg(id)}/photos`,
  },

  /**
   * Visão de preventivas (semáforo em dia / próxima / atrasada).
   * `GET /preventives` · `GET /preventives/calendar`
   */
  preventives: {
    list: () => '/preventives',
    /** Manutenções agendadas dentro de um intervalo, para o calendário. */
    calendar: () => '/preventives/calendar',
  },

  /**
   * Setores e unidades.
   * `GET|POST /sectors` · `GET|PUT|DELETE /sectors/{id}` · `GET /sectors/summary`
   */
  sectors: {
    list: () => '/sectors',
    create: () => '/sectors',
    /** Declarado antes de `/sectors/{id}` no backend para não colidir. */
    summary: () => '/sectors/summary',
    byId: (id: string) => `/sectors/${seg(id)}`,
    update: (id: string) => `/sectors/${seg(id)}`,
    remove: (id: string) => `/sectors/${seg(id)}`,
  },

  /**
   * Estoque de peças e suas movimentações.
   * `GET|POST /parts` · `GET|PUT|DELETE /parts/{id}`
   * `GET|POST /parts/{id}/movements`
   */
  parts: {
    list: () => '/parts',
    create: () => '/parts',
    byId: (id: string) => `/parts/${seg(id)}`,
    update: (id: string) => `/parts/${seg(id)}`,
    remove: (id: string) => `/parts/${seg(id)}`,
    /** `GET`: extrato (kardex) da peça. */
    movements: (id: string) => `/parts/${seg(id)}/movements`,
    /** `POST`: entrada, saída, ajuste ou descarte; recalcula o saldo. */
    createMovement: (id: string) => `/parts/${seg(id)}/movements`,
  },

  /**
   * Central de notificações.
   * `GET /notifications` · `PATCH /notifications/{id}/read`
   * `POST /notifications/read-all` · `DELETE /notifications/{id}`
   */
  notifications: {
    list: () => '/notifications',
    read: (id: string) => `/notifications/${seg(id)}/read`,
    readAll: () => '/notifications/read-all',
    remove: (id: string) => `/notifications/${seg(id)}`,
  },

  /**
   * Agregados do dashboard (todos aceitam `from`, `to` e `sectorId`).
   * `GET /dashboard/metrics|monthly|sectors|status|duration|activity`
   */
  dashboard: {
    metrics: () => '/dashboard/metrics',
    monthly: () => '/dashboard/monthly',
    sectors: () => '/dashboard/sectors',
    status: () => '/dashboard/status',
    duration: () => '/dashboard/duration',
    activity: () => '/dashboard/activity',
  },

  /**
   * Relatórios analíticos e exportação.
   * `GET /reports/preventives|computers-by-sector|parts-usage|technician-productivity`
   * `GET /reports/computer-history/{id}`
   * `GET /reports/{key}/export?format=pdf|xlsx|csv`
   */
  reports: {
    preventives: () => '/reports/preventives',
    computersBySector: () => '/reports/computers-by-sector',
    computerHistory: (computerId: string) => `/reports/computer-history/${seg(computerId)}`,
    partsUsage: () => '/reports/parts-usage',
    technicianProductivity: () => '/reports/technician-productivity',
    /** O `format` viaja em `params`, junto com os demais filtros do relatório. */
    export: (key: ReportKey) => `/reports/${seg(key)}/export`,
  },

  /**
   * Usuários e permissões.
   * `GET|POST /users` · `GET|PUT|DELETE /users/{id}`
   */
  users: {
    list: () => '/users',
    create: () => '/users',
    byId: (id: string) => `/users/${seg(id)}`,
    update: (id: string) => `/users/${seg(id)}`,
    remove: (id: string) => `/users/${seg(id)}`,
  },

  /**
   * Busca global do Cmd+K.
   * `GET /search?q=`
   */
  search: {
    global: () => '/search',
  },

  /**
   * Ingestão de telemetria do futuro agente Windows.
   * `POST /agent/telemetry`
   */
  agent: {
    telemetry: () => '/agent/telemetry',
  },
} as const

export type Endpoints = typeof endpoints
