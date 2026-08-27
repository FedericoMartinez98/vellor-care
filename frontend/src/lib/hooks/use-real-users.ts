'use client'

/**
 * Usuários (equipe de TI e acessos) contra o backend Spring real.
 *
 * Só é usado quando `isRemoteBackend()`. No modo mock as telas seguem com
 * `useVellor()`.
 *
 * O backend devolve `UserResponse` -- sem `passwordHash`, sem `permissions`.
 * O tipo de tela `User` exige `permissions` e `createdAt`, então são
 * normalizados aqui (permissões granulares por módulo ainda não são
 * gerenciadas pela API).
 */

import * as React from 'react'

import { apiFetch, ApiError, endpoints, isRemoteBackend } from '@/lib/api'
import type { User, UserRole } from '@/lib/types'

/** Shape de `UserResponse` no backend. */
interface ApiUser {
  id: string
  name: string
  email: string
  role: UserRole
  sectorId?: string | null
  sectorName?: string | null
  avatarUrl?: string | null
  phone?: string | null
  active: boolean
  lastLoginAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

function mapApiUser(api: ApiUser): User {
  return {
    id: api.id,
    name: api.name,
    email: api.email,
    role: api.role,
    sectorId: api.sectorId ?? undefined,
    avatarUrl: api.avatarUrl ?? undefined,
    phone: api.phone ?? undefined,
    active: api.active,
    lastLoginAt: api.lastLoginAt ?? undefined,
    // A API ainda não expõe permissões granulares por módulo; o papel (role)
    // é o que governa o acesso hoje.
    permissions: [],
    createdAt: api.createdAt ?? '',
  }
}

/** Corpo de `POST /users` e `PUT /users/{id}` (`UserCreateRequest`). */
export interface UserWriteBody {
  name: string
  email: string
  password?: string
  role: UserRole
  sectorId?: string
  phone?: string
  active: boolean
}

export interface RealUsersState {
  ready: boolean
  users: User[]
  error: string | null
  refresh: () => Promise<void>
  create: (body: UserWriteBody) => Promise<User>
  update: (id: string, body: UserWriteBody) => Promise<User>
  remove: (id: string) => Promise<void>
}

export function useRealUsers(): RealUsersState {
  const [ready, setReady] = React.useState(false)
  const [users, setUsers] = React.useState<User[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!isRemoteBackend()) {
      setReady(true)
      return
    }

    setError(null)
    try {
      const list = await apiFetch<ApiUser[]>(endpoints.users.list())
      setUsers(list.map(mapApiUser))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar os usuários.')
    } finally {
      setReady(true)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const create = React.useCallback(
    async (body: UserWriteBody) => {
      const created = await apiFetch<ApiUser>(endpoints.users.create(), {
        method: 'POST',
        body: JSON.stringify(body),
      })
      await refresh()
      return mapApiUser(created)
    },
    [refresh],
  )

  const update = React.useCallback(
    async (id: string, body: UserWriteBody) => {
      const updated = await apiFetch<ApiUser>(endpoints.users.update(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      await refresh()
      return mapApiUser(updated)
    },
    [refresh],
  )

  const remove = React.useCallback(
    async (id: string) => {
      await apiFetch<void>(endpoints.users.remove(id), { method: 'DELETE' })
      await refresh()
    },
    [refresh],
  )

  return { ready, users, error, refresh, create, update, remove }
}
