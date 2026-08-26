'use client'

import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface CopyButtonProps {
  value: string
  label?: string
  className?: string
}

/** Tempo que o ícone de confirmação permanece visível, em ms. */
const FEEDBACK_MS = 1500

function CopyButton({ value, label = 'Copiar', className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)
  const timeoutRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  async function handleCopy() {
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard

    if (!clipboard) {
      toast.error('Este navegador não permite copiar automaticamente.')
      return
    }

    try {
      await clipboard.writeText(value)
      setCopied(true)
      toast.success('Copiado para a área de transferência.')

      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setCopied(false), FEEDBACK_MS)
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? 'Copiado' : label}
      title={label}
      onClick={() => void handleCopy()}
      className={cn('shrink-0', className)}
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4 text-success" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
    </Button>
  )
}

export { CopyButton }
