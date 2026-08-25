'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/** Classe a aplicar no Input quando houver ícone à esquerda. */
const inputGroupInputClass = 'pl-9'
/** Classe a aplicar no Input quando houver ícone à direita. */
const inputGroupInputRightClass = 'pr-9'

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-group" className={cn('relative w-full', className)} {...props} />
  )
}

type InputGroupIconProps = React.ComponentProps<'span'> & {
  /** Lado em que o ícone é posicionado. */
  side?: 'left' | 'right'
}

function InputGroupIcon({ className, side = 'left', ...props }: InputGroupIconProps) {
  return (
    <span
      data-slot="input-group-icon"
      data-side={side}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
        side === 'left' ? 'left-3' : 'right-3',
        "[&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  )
}

export { InputGroup, InputGroupIcon, inputGroupInputClass, inputGroupInputRightClass }
