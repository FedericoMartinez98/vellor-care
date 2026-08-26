'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SEVERITY_TONE } from '@/lib/constants'
import { formatRelative } from '@/lib/format'
import { useVellor } from '@/lib/store'
import type { AppNotification } from '@/lib/types'
import { cn } from '@/lib/utils'

export function NotificationsMenu() {
  const router = useRouter()
  const { ready, notifications, unreadCount, markNotificationRead, markAllNotificationsRead } =
    useVellor()

  const [open, setOpen] = useState(false)

  const ordered = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [notifications],
  )

  const handleSelect = useCallback(
    (notification: AppNotification) => {
      if (!notification.read) markNotificationRead(notification.id)
      setOpen(false)
      if (notification.href) router.push(notification.href)
    },
    [markNotificationRead, router],
  )

  // O contador só aparece depois da hidratação para não divergir do HTML do servidor.
  const badgeCount = ready ? unreadCount : 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="size-4" aria-hidden="true" />
          {badgeCount > 0 ? (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-danger-foreground tabular">
              {badgeCount > 99 ? '99+' : badgeCount}
              <span className="sr-only"> não lidas</span>
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-sm font-semibold">Notificações</h2>
          {badgeCount > 0 ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => markAllNotificationsRead()}
            >
              Marcar todas como lidas
            </Button>
          ) : null}
        </div>

        <Separator />

        {ordered.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="Tudo em dia"
            description="Nenhuma notificação no momento."
            className="py-10"
          />
        ) : (
          <ScrollArea className="max-h-[420px]">
            <ul className="divide-y divide-border">
              {ordered.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className={cn(
                      'focus-ring flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
                      !notification.read && 'bg-primary-soft/40',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        SEVERITY_TONE[notification.severity].dot,
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{notification.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {formatRelative(notification.createdAt)}
                      </span>
                    </span>
                    {!notification.read ? (
                      <span className="sr-only">Não lida</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
