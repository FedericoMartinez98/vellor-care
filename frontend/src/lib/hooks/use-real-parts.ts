'use client'

/**
 * Catálogo de peças (estoque) contra o backend Spring real, somente leitura.
 *
 * Necessário para a execução de preventiva: as peças consumidas viajam por
 * `partId`, e o backend rejeita a conclusão inteira com 400 ("Peça não
 * encontrada no catálogo") se o id não existir lá. Com o seletor lendo do
 * store mock, os ids seriam do tipo `part-abc123` (gerados no cliente) e
 * nunca casariam com os UUIDs reais.
 *
 * Atenção: `partsApi.list()` em `@/lib/api` está tipado como paginado
 * (`Page<InventoryPart>`), mas `GET /api/v1/parts` devolve um array simples --
 * por isso a busca aqui é via `apiFetch` direto, como em `useRealInventory`.
 */

import * as React from 'react'

import { apiFetch, ApiError, endpoints, isRemoteBackend } from '@/lib/api'
import type { InventoryMovement, InventoryPart } from '@/lib/types'

/** Shape de `InventoryPart` como o backend devolve. */
interface ApiPart {
  id: string
  sku: string
  name: string
  category: InventoryPart['category']
  quantity: number
  minimumQuantity: number
  unit: string
  supplier?: string | null
  unitValue: number
  location?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

function mapApiPart(api: ApiPart): InventoryPart {
  return {
    id: api.id,
    sku: api.sku,
    name: api.name,
    category: api.category,
    quantity: api.quantity,
    minimumQuantity: api.minimumQuantity,
    unit: api.unit,
    supplier: api.supplier ?? undefined,
    unitValue: api.unitValue,
    location: api.location ?? undefined,
    notes: api.notes ?? undefined,
    updatedAt: api.updatedAt ?? '',
  }
}

/** Shape de `InventoryMovement` como o backend devolve. */
interface ApiMovement {
  id: string
  partId: string
  partName?: string | null
  type: InventoryMovement['type']
  quantity: number
  balanceAfter: number
  maintenanceId?: string | null
  computerAssetTag?: string | null
  userId?: string | null
  userName?: string | null
  reason?: string | null
  createdAt: string
}

function mapApiMovement(api: ApiMovement): InventoryMovement {
  return {
    id: api.id,
    partId: api.partId,
    partName: api.partName ?? '',
    type: api.type,
    quantity: api.quantity,
    balanceAfter: api.balanceAfter,
    maintenanceId: api.maintenanceId ?? undefined,
    computerAssetTag: api.computerAssetTag ?? undefined,
    userId: api.userId ?? '',
    userName: api.userName ?? '',
    reason: api.reason ?? undefined,
    createdAt: api.createdAt,
  }
}

export interface RealPartsState {
  ready: boolean
  parts: InventoryPart[]
  movements: InventoryMovement[]
  error: string | null
  refresh: () => Promise<void>
}

export function useRealParts(): RealPartsState {
  const [ready, setReady] = React.useState(false)
  const [parts, setParts] = React.useState<InventoryPart[]>([])
  const [movements, setMovements] = React.useState<InventoryMovement[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!isRemoteBackend()) {
      setReady(true)
      return
    }

    setError(null)
    try {
      // Os movimentos ficam num caminho plano (/parts/movements), não aninhados
      // sob a peça -- `endpoints.parts.movements(id)` aponta para uma rota que
      // não existe no backend.
      const [list, movs] = await Promise.all([
        apiFetch<ApiPart[]>(endpoints.parts.list()),
        apiFetch<ApiMovement[]>('/parts/movements'),
      ])
      setParts(list.map(mapApiPart))
      setMovements(movs.map(mapApiMovement))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar o estoque de peças.')
    } finally {
      setReady(true)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  return { ready, parts, movements, error, refresh }
}
