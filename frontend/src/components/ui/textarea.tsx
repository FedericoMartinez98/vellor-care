'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-sizing-content min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
        'shadow-xs transition placeholder:text-muted-foreground',
        'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'selection:bg-primary selection:text-primary-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
