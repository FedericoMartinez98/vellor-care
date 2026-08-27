'use client'

/**
 * Ordens de serviço (manutenções) contra o backend Spring real.
 *
 * Só é usado quando `isRemoteBackend()`. No modo mock (sem
 * NEXT_PUBLIC_API_BASE_URL) o hook fica ocioso e as telas seguem usando
 * `useVellor()`.
 *
 * Nota sobre respostas de escrita: `MaintenanceMapper.toEntity` no backend não
 * preenche as associações `computer`/`technician`, então POST/PUT devolvem
 * `assetTag`/`hostname`/`technicianName` vazios (o GET devolve populado). Por
 * isso toda escrita aqui faz `refresh()` (GET) em vez de confiar no corpo da
 * resposta -- senão a linha da tabela apareceria sem patrimônio nem técnico.
 */

import * as React from 'react'

import { apiFetch, ApiError, endpoints, isRemoteBackend } from '@/lib/api'
import {
  type ApiMaintenance,
  type MaintenanceCompleteBody,
  type MaintenanceCreateBody,
  mapApiMaintenance,
} from '@/lib/api/maintenance-mappers'
import type { Maintenance } from '@/lib/types'

export interface RealMaintenancesState {
  ready: boolean
  maintenances: Maintenance[]
  error: string | null
  refresh: () => Promise<void>
  create: (body: MaintenanceCreateBody) => Promise<Maintenance>
  start: (id: string) => Promise<void>
  complete: (id: string, body: MaintenanceCompleteBody) => Promise<void>
  reschedule: (id: string, newScheduledFor: string) => Promise<void>
  cancel: (id: string, reason?: string) => Promise<void>
}

export function useRealMaintenances(): RealMaintenancesState {
  const [ready, setReady] = React.useState(false)
  const [maintenances, setMaintenances] = React.useState<Maintenance[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!isRemoteBackend()) {
      setReady(true)
      return
    }

    setError(null)
    try {
      const list = await apiFetch<ApiMaintenance[]>(endpoints.maintenances.list())
      setMaintenances(list.map(mapApiMaintenance))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar as manutenções.')
    } finally {
      setReady(true)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const create = React.useCallback(
    async (body: MaintenanceCreateBody) => {
      const created = await apiFetch<ApiMaintenance>(endpoints.maintenances.create(), {
        method: 'POST',
        body: JSON.stringify(body),
      })
      await refresh()
      return mapApiMaintenance(created)
    },
    [refresh],
  )

  const start = React.useCallback(
    async (id: string) => {
      // Endpoint sem corpo -- mandar body aqui seria ignorado pelo backend.
      await apiFetch<ApiMaintenance>(endpoints.maintenances.start(id), { method: 'POST' })
      await refresh()
    },
    [refresh],
  )

  const complete = React.useCallback(
    async (id: string, body: MaintenanceCompleteBody) => {
      await apiFetch<ApiMaintenance>(endpoints.maintenances.complete(id), {
        method: 'POST',
        body: JSON.stringify(body),
      })
      await refresh()
    },
    [refresh],
  )

  const reschedule = React.useCallback(
    async (id: string, newScheduledFor: string) => {
      // PUT (não POST) e o campo é `newScheduledFor` (não `scheduledFor`).
      await apiFetch<ApiMaintenance>(endpoints.maintenances.reschedule(id), {
        method: 'PUT',
        body: JSON.stringify({ newScheduledFor }),
      })
      await refresh()
    },
    [refresh],
  )

  const cancel = React.useCallback(
    async (id: string, reason?: string) => {
      // O motivo vai em query param, não no corpo.
      await apiFetch<ApiMaintenance>(endpoints.maintenances.cancel(id), {
        method: 'POST',
        params: reason ? { reason } : undefined,
      })
      await refresh()
    },
    [refresh],
  )

  return { ready, maintenances, error, refresh, create, start, complete, reschedule, cancel }
}
