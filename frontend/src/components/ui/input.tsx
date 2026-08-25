'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm',
        'shadow-xs transition placeholder:text-muted-foreground',
        'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        'selection:bg-primary selection:text-primary-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
