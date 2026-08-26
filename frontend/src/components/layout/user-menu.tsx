'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { isRemoteBackend } from '@/lib/api'
import { useRealAuth } from '@/lib/hooks/use-real-auth'
import { USER_ROLE_LABELS } from '@/lib/constants'
import { initials } from '@/lib/format'
import { useVellor } from '@/lib/store'

export function UserMenu() {
  const router = useRouter()
  const mock = useVellor()
  const real = useRealAuth()
  const remote = isRemoteBackend()

  const ready = remote ? real.ready : mock.ready
  const currentUser = remote ? real.user : mock.currentUser

  async function handleLogout() {
    if (remote) {
      await real.logout()
    } else {
      toast.info('Sessão encerrada.')
    }
    router.push('/login')
  }

  // O usuário atual vem do localStorage: só renderiza depois da hidratação.
  if (!ready || !currentUser) {
    return <Skeleton className="size-9 rounded-full" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full p-0"
          aria-label={`Menu da conta de ${currentUser.name}`}
        >
          <Avatar className="size-8">
            {currentUser.avatarUrl ? (
              <AvatarImage src={currentUser.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initials(currentUser.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{currentUser.name}</p>
          <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
          <Badge variant="secondary" className="mt-2">
            {USER_ROLE_LABELS[currentUser.role]}
          </Badge>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => router.push('/configuracoes')}>
          <Settings className="size-4" aria-hidden="true" />
          <span>Configurações</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={() => void handleLogout()}>
          <LogOut className="size-4" aria-hidden="true" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
