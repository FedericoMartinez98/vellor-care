'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (o: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}

function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const changeOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  /** Impede que Esc, clique fora ou Cancelar fechem o diálogo no meio da ação. */
  function handleOpenChange(next: boolean) {
    if (pending && !next) return
    changeOpen(next)
  }

  async function handleConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    // Sem o preventDefault o Radix fecharia o diálogo antes da promise resolver.
    event.preventDefault()
    if (pending) return

    setPending(true)
    try {
      await onConfirm()
      changeOpen(false)
    } catch {
      // O diálogo permanece aberto; quem chama exibe o erro (toast) e o usuário pode tentar de novo.
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={handleConfirm}
            className={cn(destructive && buttonVariants({ variant: 'destructive' }))}
          >
            {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { ConfirmDialog }
