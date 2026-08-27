'use client'

/**
 * Notificações (o sininho da barra) contra o backend real.
 *
 * O backend resolve o usuário pelo token, então não é preciso mandar id.
 * Atenção aos verbos: marcar como lida é **PUT** `/notifications/{id}/read` e
 * **PUT** `/notifications/read-all` (não POST), e `endpoints.notifications`
 * declara `read-all` como POST — por isso as chamadas aqui são explícitas.
 */

import * as React from 'react'

import { apiFetch, ApiError, isRemoteBackend } from '@/lib/api'
import type { AppNotification } from '@/lib/types'

interface ApiNotification {
  id: string
  type: AppNotification['type']
  severity: AppNotification['severity']
  title: string
  message: string
  computerId?: string | null
  maintenanceId?: string | null
  partId?: string | null
  href?: string | null
  read: boolean
  createdAt: string
}

function mapApiNotification(api: ApiNotification): AppNotification {
  return {
    id: api.id,
    type: api.type,
    severity: api.severity,
    title: api.title,
    message: api.message,
    computerId: api.computerId ?? undefined,
    maintenanceId: api.maintenanceId ?? undefined,
    partId: api.partId ?? undefined,
    href: api.href ?? undefined,
    read: api.read,
    createdAt: api.createdAt,
  }
}

export interface RealNotificationsState {
  ready: boolean
  notifications: AppNotification[]
  unreadCount: number
  error: string | null
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export function useRealNotifications(): RealNotificationsState {
  const [ready, setReady] = React.useState(false)
  const [notifications, setNotifications] = React.useState<AppNotification[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!isRemoteBackend()) {
      setReady(true)
      return
    }

    setError(null)
    try {
      const list = await apiFetch<ApiNotification[]>('/notifications')
      setNotifications(list.map(mapApiNotification))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar notificações.')
    } finally {
      setReady(true)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const markRead = React.useCallback(
    async (id: string) => {
      await apiFetch<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' })
      await refresh()
    },
    [refresh],
  )

  const markAllRead = React.useCallback(async () => {
    await apiFetch<void>('/notifications/read-all', { method: 'PUT' })
    await refresh()
  }, [refresh])

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  return { ready, notifications, unreadCount, error, refresh, markRead, markAllRead }
}
