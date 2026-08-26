'use client'

/**
 * Inventário (lista + setores) contra o backend Spring real, para as telas
 * que já foram religadas (`InventoryView`, `ComputerDetail`). Só é usado
 * quando `isRemoteBackend()` — sem `NEXT_PUBLIC_API_BASE_URL` configurada
 * (ex: o deploy de demonstração na Vercel), essas telas continuam no modo
 * mockado de sempre via `useVellor()`.
 *
 * Nota de tipagem: `computersApi.list()`/`sectorsApi.list()` (em
 * `@/lib/api`) estão tipados como se o JSON do backend já batesse com os
 * tipos de tela — não bate (`ComputerController.list()` devolve um array
 * simples, não paginado, e os campos de `assignment`/`sectorId` divergem).
 * Por isso este hook busca via `apiFetch` com o shape real (`ApiComputer`/
 * `ApiSector` de `@/lib/api/mappers`) e converte explicitamente.
 */

import * as React from 'react'

import { apiFetch, ApiError, endpoints, isRemoteBackend } from '@/lib/api'
import { computersApi } from '@/lib/api'
import { type ApiComputer, type ApiSector, mapApiComputer, mapApiSector } from '@/lib/api/mappers'
import type { Computer, Sector } from '@/lib/types'

export interface RealInventoryState {
  /** `false` enquanto a primeira busca não termina. */
  ready: boolean
  computers: Computer[]
  sectors: Sector[]
  error: string | null
  refresh: () => Promise<void>
  removeComputer: (id: string) => Promise<void>
}

export function useRealInventory(): RealInventoryState {
  const [ready, setReady] = React.useState(false)
  const [computers, setComputers] = React.useState<Computer[]>([])
  const [sectors, setSectors] = React.useState<Sector[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!isRemoteBackend()) {
      setReady(true)
      return
    }

    setError(null)
    try {
      const [apiSectors, apiComputers] = await Promise.all([
        apiFetch<ApiSector[]>(endpoints.sectors.list()),
        apiFetch<ApiComputer[]>(endpoints.computers.list()),
      ])
      const mappedSectors = apiSectors.map(mapApiSector)
      const unitNameBySectorId = new Map(apiSectors.map((s) => [s.id, s.unitName]))

      setSectors(mappedSectors)
      setComputers(
        apiComputers.map((api) => {
          const computer = mapApiComputer(api)
          return {
            ...computer,
            assignment: {
              ...computer.assignment,
              unit: unitNameBySectorId.get(api.assignment.sectorId) ?? '',
            },
          }
        }),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar o inventário.')
    } finally {
      setReady(true)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const removeComputer = React.useCallback(async (id: string) => {
    await computersApi.remove(id)
    setComputers((current) => current.filter((computer) => computer.id !== id))
  }, [])

  return { ready, computers, sectors, error, refresh, removeComputer }
}
