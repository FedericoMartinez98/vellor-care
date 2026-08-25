/**
 * Vellor Care — Cliente HTTP da API REST.
 *
 * Camada única de saída para o backend Spring Boot. Concentra montagem de URL,
 * autenticação Bearer, tradução de erro HTTP para `ApiError` (mensagem em
 * pt-BR) e os dois casos especiais que `fetch` não resolve sozinho: upload
 * multipart e download de arquivo.
 *
 * Enquanto `NEXT_PUBLIC_API_BASE_URL` não estiver definida, `API_BASE_URL` é
 * string vazia e as chamadas caem em caminho relativo (mesma origem do Next).
 * Nenhuma tela consome este módulo ainda — ver `@/lib/api` para o roteiro de
 * migração.
 */

/** Base da API. Vazia = mesma origem (rotas relativas). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

/** `true` quando o front está apontado para um backend externo real. */
export const isRemoteBackend = (): boolean => API_BASE_URL.length > 0

/** Chave do JWT no `localStorage`. */
export const TOKEN_STORAGE_KEY = 'vellor-care:token'

// ============================================================================
// Tipos públicos
// ============================================================================

export type QueryParamValue = string | number | boolean | undefined | null

/** Query string tipada: chaves com valor `undefined`/`null` são omitidas. */
export type QueryParams = Record<string, QueryParamValue>

export interface ApiRequestInit extends RequestInit {
  params?: QueryParams
}

/** Erro de transporte ou de negócio devolvido pela API. `status` 0 = falha de rede. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ============================================================================
// Token de autenticação
// ============================================================================

const isBrowser = (): boolean => typeof window !== 'undefined'

export function getToken(): string | null {
  if (!isBrowser()) return null

  // Navegação anônima e políticas corporativas podem bloquear o storage.
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // Sessão segue apenas em memória do servidor; nada a fazer no client.
  }
}

export function clearToken(): void {
  if (!isBrowser()) return

  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Idem acima.
  }
}

// ============================================================================
// Montagem da requisição
// ============================================================================

function buildUrl(path: string, params?: QueryParams): string {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`

  if (!params) return url

  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    search.append(key, String(value))
  }

  const queryString = search.toString()
  if (queryString.length === 0) return url

  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`
}

interface HeaderOptions {
  /** Envia `Content-Type: application/json`. Desligue em multipart. */
  json?: boolean
  accept?: string
}

function buildHeaders(init: HeadersInit | undefined, options: HeaderOptions = {}): Headers {
  const { json = true, accept = 'application/json' } = options
  const headers = new Headers(init)

  if (json && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!headers.has('Accept')) headers.set('Accept', accept)

  const token = getToken()
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

  return headers
}

// ============================================================================
// Tratamento da resposta
// ============================================================================

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Requisição inválida.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Você não tem permissão para executar esta ação.',
  404: 'Registro não encontrado.',
  405: 'Operação não suportada por este recurso.',
  409: 'Conflito: o registro já existe ou foi alterado por outra pessoa.',
  413: 'Arquivo grande demais para o servidor.',
  415: 'Formato de arquivo não suportado.',
  422: 'Não foi possível validar os dados enviados.',
  429: 'Muitas requisições em pouco tempo. Aguarde alguns segundos.',
  500: 'Erro interno do servidor.',
  502: 'O servidor da API respondeu de forma inesperada.',
  503: 'Serviço temporariamente indisponível.',
  504: 'O servidor demorou demais para responder.',
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

/**
 * Extrai a mensagem do corpo de erro. Cobre os três formatos que o Spring Boot
 * produz: `ProblemDetail` (`detail`/`title`), o corpo padrão do
 * `DefaultErrorAttributes` (`message`/`error`) e texto puro.
 */
function messageFromPayload(payload: unknown): string | undefined {
  if (typeof payload === 'string') {
    const text = payload.trim()
    // Páginas de erro de proxy chegam como HTML gigante — não servem de mensagem.
    return text.length > 0 && text.length <= 300 && !text.startsWith('<') ? text : undefined
  }

  const record = asRecord(payload)
  if (!record) return undefined

  for (const key of ['message', 'detail', 'error_description', 'title', 'error']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }

  return undefined
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('json')) {
    try {
      return (await response.json()) as unknown
    } catch {
      return undefined
    }
  }

  try {
    const text = await response.text()
    return text.length > 0 ? text : undefined
  } catch {
    return undefined
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const payload = await parseBody(response)

  // Token inválido/expirado: derruba a credencial local antes de propagar.
  if (response.status === 401) clearToken()

  const message =
    messageFromPayload(payload) ??
    STATUS_MESSAGES[response.status] ??
    `Falha na requisição (HTTP ${response.status}).`

  return new ApiError(response.status, message, payload)
}

function isEmpty(response: Response): boolean {
  return (
    response.status === 204 ||
    response.status === 205 ||
    response.headers.get('content-length') === '0'
  )
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) throw await toApiError(response)
  if (isEmpty(response)) return undefined as T

  return (await parseBody(response)) as T
}

/** `fetch` com falha de rede normalizada. `AbortError` é repassado intacto. */
async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error

    throw new ApiError(
      0,
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      error,
    )
  }
}

// ============================================================================
// API pública
// ============================================================================

/**
 * Requisição JSON. Aceita `params` (query string), `signal` (AbortController)
 * e qualquer outra opção de `RequestInit`.
 */
export async function apiFetch<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const { params, headers, ...rest } = init ?? {}

  const response = await send(buildUrl(path, params), { ...rest, headers: buildHeaders(headers) })

  return handle<T>(response)
}

/**
 * Upload de arquivo único via `multipart/form-data`. O `Content-Type` é
 * deixado a cargo do navegador para que o `boundary` seja gerado corretamente.
 */
export async function apiUpload<T>(
  path: string,
  file: File,
  field = 'file',
  params?: QueryParams,
): Promise<T> {
  const body = new FormData()
  body.append(field, file, file.name)

  const response = await send(buildUrl(path, params), {
    method: 'POST',
    body,
    headers: buildHeaders(undefined, { json: false }),
  })

  return handle<T>(response)
}

/** Baixa o recurso como arquivo e dispara o download no navegador. */
export async function apiDownload(
  path: string,
  filename: string,
  params?: QueryParams,
): Promise<void> {
  if (!isBrowser()) throw new ApiError(0, 'O download só está disponível no navegador.')

  const response = await send(buildUrl(path, params), {
    method: 'GET',
    headers: buildHeaders(undefined, { json: false, accept: '*/*' }),
  })

  if (!response.ok) throw await toApiError(response)

  const objectUrl = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'

  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  // Revogar imediatamente cancela o download em alguns navegadores.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
}
