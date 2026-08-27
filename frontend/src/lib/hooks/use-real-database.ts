'use client'

/**
 * Monta um objeto no formato `VellorDatabase` a partir dos dados reais do
 * backend.
 *
 * Motivo: os cálculos do Dashboard (e de Relatórios, busca global, etc.) vivem
 * em `lib/store/selectors.ts` e recebem o banco inteiro
 * (`buildDashboardMetrics(db)`, `buildMonthlySeries(db, meses)`...). Em vez de
 * reescrever essa lógica de agregação — que já está testada e é a mesma para
 * os dois modos — este hook entrega o mesmo shape alimentado pela API. Assim a
 * conta é feita uma vez só, não duas.
 *
 * As coleções que os selectors realmente leem são `maintenances`, `computers`,
 * `sectors`, `parts` e `users`; `units`, `movements` e `notifications` vão
 * vazias porque nenhum cálculo do dashboard depende delas hoje (movimentos de
 * estoque só entram em Relatórios > consumo de peças, que segue mock).
 */

import * as React from 'react'

import { isRemoteBackend } from '@/lib/api'
import { useRealInventory } from '@/lib/hooks/use-real-inventory'
import { useRealMaintenances } from '@/lib/hooks/use-real-maintenances'
import { useRealParts } from '@/lib/hooks/use-real-parts'
import { useRealUsers } from '@/lib/hooks/use-real-users'
import type { VellorDatabase } from '@/lib/data/seed'

export interface RealDatabaseState {
  ready: boolean
  db: VellorDatabase
  refresh: () => Promise<void>
}

export function useRealDatabase(): RealDatabaseState {
  const inventory = useRealInventory()
  const maintenances = useRealMaintenances()
  const parts = useRealParts()
  const users = useRealUsers()

  const ready =
    inventory.ready && maintenances.ready && parts.ready && users.ready

  const db = React.useMemo<VellorDatabase>(
    () => ({
      units: [],
      sectors: inventory.sectors,
      users: users.users,
      computers: inventory.computers,
      maintenances: maintenances.maintenances,
      parts: parts.parts,
      movements: [],
      notifications: [],
      currentUserId: '',
    }),
    [inventory.sectors, inventory.computers, maintenances.maintenances, parts.parts, users.users],
  )

  const refresh = React.useCallback(async () => {
    if (!isRemoteBackend()) return
    await Promise.all([
      inventory.refresh(),
      maintenances.refresh(),
      parts.refresh(),
      users.refresh(),
    ])
  }, [inventory, maintenances, parts, users])

  return { ready, db, refresh }
}
